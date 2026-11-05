import { test } from "node:test";
import assert from "node:assert/strict";
import { defaults, makeDrill, variant } from "../src/data.ts";
import {
  accuracy,
  activeDuration,
  advance,
  duration,
  freshStore,
  KEY,
  loadStore,
  parseBackup,
  pause,
  phases,
  reconcile,
  recover,
  resume,
  saveStore,
  startSession,
  validRoutine,
} from "../src/core.ts";
import type { Routine } from "../src/types.ts";
const timed = (): Routine => ({
  ...defaults()[0],
  drills: [
    { ...makeDrill("vertical"), sets: 2, seconds: 10, prep: 3, rest: 2 },
  ],
});
test("all eight presets close exactly, with independent difficulty parameters", () => {
  assert.equal(defaults().length, 8);
  for (const r of defaults()) {
    assert.ok(validRoutine(r));
    assert.equal(duration(r), r.advertisedMinutes! * 60, r.name);
    for (const d of ["Fácil", "Média", "Difícil"] as const) {
      const v = variant(r, d);
      assert.equal(duration(v), duration(r));
      assert.ok(validRoutine(v));
    }
    assert.notEqual(
      variant(r, "Fácil").drills[0].amplitude,
      variant(r, "Difícil").drills[0].amplitude,
    );
    assert.ok(activeDuration(r) < duration(r));
  }
});
test("prep once per exercise, rests between sets and exercises, no trailing rest", () => {
  const r = timed();
  assert.equal(duration(r), 25);
  assert.equal(activeDuration(r), 20);
  assert.deepEqual(
    phases(r).map((p) => p.kind),
    ["prep", "work", "rest", "work"],
  );
});
test("pause / resume excludes paused wall time", () => {
  let s = resume(startSession(timed(), 0), 0);
  s = pause(s, 5000, true);
  assert.equal(s.phase, 1);
  assert.equal(s.remainingMs, 8000);
  assert.equal(s.activeMs, 2000);
  s = resume(s, 100000);
  s = reconcile(s, 103000, true);
  assert.equal(s.remainingMs, 5000);
  assert.equal(s.elapsedMs, 8000);
  assert.equal(s.activeMs, 5000);
});
test("background return reconciles multiple phases and caps at total session time", () => {
  const s = reconcile(resume(startSession(timed(), 0), 0), 100000, true);
  assert.equal(s.phase, 4);
  assert.equal(s.running, false);
  assert.equal(s.elapsedMs, 25000);
  assert.equal(s.activeMs, 20000);
  assert.equal(s.skillMs.Flick, 20000);
});
test("many small ticks equal a single absolute timestamp", () => {
  let s = resume(startSession(timed(), 0), 0);
  const original = s;
  for (let t = 137; t < 18000; t += 137) s = reconcile(s, t, true);
  s = reconcile(s, 18000, true);
  const once = reconcile(original, 18000, true);
  assert.equal(s.remainingMs, once.remainingMs);
  assert.equal(s.activeMs, once.activeMs);
  assert.equal(s.elapsedMs, once.elapsedMs);
});
test("manual repetitions never advance at the estimated deadline and count overtime once", () => {
  const r = timed();
  r.drills[0].mode = "reps";
  let s = reconcile(resume(startSession(r, 0), 0), 30000, true);
  assert.equal(s.phase, 1);
  assert.equal(s.waiting, true);
  assert.equal(s.activeMs, 27000);
  s = reconcile(s, 31000, true);
  assert.equal(s.activeMs, 28000);
  s = pause(s, 32000, true);
  s = resume(s, 100000);
  s = reconcile(s, 101000, true);
  assert.equal(s.activeMs, 30000);
  s = advance(s, 101000);
  assert.equal(s.phase, 2);
});
test("automatic advancement can be disabled for timed work", () => {
  const s = reconcile(resume(startSession(timed(), 0), 0), 30000, false);
  assert.equal(s.phase, 1);
  assert.ok(s.waiting);
});
test("recovery reconciles a saved running clock but never resumes it automatically", () => {
  const s = recover(resume(startSession(timed(), 0), 0), 6000);
  assert.equal(s.phase, 1);
  assert.equal(s.running, false);
  assert.equal(s.deadline, null);
  assert.equal(s.remainingMs, 7000);
  assert.deepEqual(reconcile(s, 900000, true), s);
});
test("skipping advances without inventing active time", () => {
  let s = startSession(timed(), 0);
  s = advance(s, 0);
  assert.equal(s.phase, 1);
  assert.equal(s.activeMs, 0);
  assert.deepEqual(s.performed, []);
});
test("round trip backup, local persistence and session recovery data", () => {
  const store = freshStore();
  store.session = pause(resume(startSession(timed(), 0), 0), 4000, true);
  const memory = new Map<string, string>();
  const storage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
  };
  assert.equal(saveStore(storage, store), "");
  assert.deepEqual(loadStore(storage).data, store);
  assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(store))), store);
  assert.ok(memory.get(KEY));
});
test("corrupt and unavailable storage produce a visible failure instead of crashing", () => {
  assert.ok(loadStore({ getItem: () => "{" }).error);
  assert.ok(
    saveStore(
      {
        setItem: () => {
          throw new Error("quota");
        },
      },
      freshStore(),
    ),
  );
});
test("backup rejects bad versions, negative times, empty routines, unknown IDs and forged results", () => {
  const cases: ((s: any) => void)[] = [
    (s) => {
      s.version = 2;
    },
    (s) => {
      s.routines[0].drills[0].seconds = -1;
    },
    (s) => {
      s.routines[0].drills = [];
    },
    (s) => {
      s.routines[0].drills[0].exerciseId = "missing";
    },
    (s) => {
      s.preferences.volume = 2;
    },
    (s) => {
      s.routines[0].equipment.velocity = -1;
    },
    (s) => {
      s.routines[0].drills[0].sets = 0;
    },
    (s) => {
      s.routines.push(s.routines[0]);
    },
  ];
  for (const change of cases) {
    const s = freshStore();
    change(s);
    assert.throws(() => parseBackup(s));
  }
  const s = freshStore();
  s.session = startSession(timed(), 0);
  s.session.phases[0].seconds = 100;
  assert.throws(() => parseBackup(s));
});
test("accuracy requires explicitly recorded valid counts", () => {
  assert.equal(accuracy(undefined, 10), null);
  assert.equal(accuracy(0, 0), null);
  assert.equal(accuracy(11, 10), null);
  assert.equal(accuracy(-1, 10), null);
  assert.equal(accuracy(2.2, 10), null);
  assert.equal(accuracy(7, 10), 70);
  assert.equal(accuracy(0, 10), 0);
});
