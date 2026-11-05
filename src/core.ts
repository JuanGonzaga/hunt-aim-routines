import { defaults, exerciseById, exercises } from "./data.ts";
import type {
  Drill,
  Equipment,
  Phase,
  Routine,
  Session,
  Store,
} from "./types.ts";
export const KEY = "hunt-aim-routines:v1";
export function phases(r: Routine): Phase[] {
  const p: Phase[] = [];
  r.drills.forEach((d, drillIndex) => {
    if (d.prep) p.push({ kind: "prep", seconds: d.prep, drillIndex, set: 1 });
    for (let set = 1; set <= d.sets; set++) {
      p.push({ kind: "work", seconds: d.seconds, drillIndex, set });
      if (d.rest && (set < d.sets || drillIndex < r.drills.length - 1))
        p.push({ kind: "rest", seconds: d.rest, drillIndex, set });
    }
  });
  return p;
}
export const duration = (r: Routine) =>
  phases(r).reduce((n, p) => n + p.seconds, 0);
export const activeDuration = (r: Routine) =>
  r.drills.reduce((n, d) => n + d.seconds * d.sets, 0);
export const estimated = (r: Routine) =>
  r.drills.some((d) => d.mode === "reps");
export function clock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
export function startSession(routine: Routine, now = Date.now()): Session {
  const plan = phases(routine);
  return {
    id: crypto.randomUUID(),
    routine: structuredClone(routine),
    phases: plan,
    phase: 0,
    remainingMs: plan[0].seconds * 1000,
    deadline: null,
    running: false,
    startedAt: new Date(now).toISOString(),
    elapsedMs: 0,
    activeMs: 0,
    skillMs: {},
    performed: [],
    skipped: false,
    waiting: false,
    results: [],
  };
}
function account(s: Session, milliseconds: number) {
  if (milliseconds <= 0) return;
  s.elapsedMs += milliseconds;
  const p = s.phases[s.phase];
  if (p?.kind === "work") {
    s.activeMs += milliseconds;
    const d = s.routine.drills[p.drillIndex];
    const skill = exerciseById(d.exerciseId).skill;
    s.skillMs[skill] = (s.skillMs[skill] ?? 0) + milliseconds;
    if (!s.performed.includes(d.id)) s.performed.push(d.id);
  }
}
export function advance(input: Session, now = Date.now()): Session {
  const s = structuredClone(input);
  s.phase++;
  s.waiting = false;
  if (s.phase >= s.phases.length) {
    s.running = false;
    s.deadline = null;
    s.remainingMs = 0;
    return s;
  }
  s.remainingMs = s.phases[s.phase].seconds * 1000;
  s.deadline = s.running ? now + s.remainingMs : null;
  return s;
}
// Absolute deadlines reconcile all elapsed phases, including a throttled background tab.
export function reconcile(input: Session, now: number, auto: boolean): Session {
  if (
    !input.running ||
    input.deadline === null ||
    input.phase >= input.phases.length
  )
    return input;
  let s = structuredClone(input);
  while (s.running && s.deadline !== null && s.phase < s.phases.length) {
    const p = s.phases[s.phase];
    const drill = s.routine.drills[p.drillIndex];
    const left = Math.max(0, s.deadline - now);
    const manual = p.kind === "work" && (drill.mode === "reps" || !auto);
    if (manual) {
      // A manual series remains active past its estimate until confirmed.
      const previousOverrun = Math.max(0, -s.remainingMs);
      const elapsed = Math.max(0, now - s.deadline);
      const delta =
        Math.max(0, s.remainingMs) - left + elapsed - previousOverrun;
      account(s, Math.max(0, delta));
      s.remainingMs = s.deadline - now;
      s.waiting = left === 0;
      return s;
    }
    account(s, Math.max(0, s.remainingMs - left));
    s.remainingMs = left;
    if (left > 0) return s;
    const boundary = s.deadline;
    s = advance(s, boundary);
  }
  return s;
}
export function pause(input: Session, now: number, auto: boolean): Session {
  const s = reconcile(input, now, auto);
  return { ...s, running: false, deadline: null };
}
export const resume = (s: Session, now = Date.now()): Session =>
  s.phase >= s.phases.length
    ? s
    : { ...s, running: true, deadline: now + s.remainingMs };
export const recover = (s: Session, now = Date.now(), auto = true): Session =>
  pause(s, now, auto);
export function freshStore(): Store {
  return {
    version: 1,
    routines: defaults(),
    history: [],
    preferences: {
      sound: true,
      volume: 0.35,
      autoAdvance: true,
      movingTarget: false,
    },
    session: null,
  };
}

const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number) =>
  num(v, min, max) && Number.isInteger(v);
const str = (v: unknown, max = 2000) =>
  typeof v === "string" && v.length <= max;
const one = (v: unknown, values: string[]) =>
  typeof v === "string" && values.includes(v);
const distance = (v: unknown) => one(v, ["Curta", "Média", "Longa", "Mista"]);
const diff = (v: unknown) => one(v, ["Fácil", "Média", "Difícil"]);
export function validEquipment(e: unknown): e is Equipment {
  return (
    obj(e) &&
    one(e.type, ["Arma principal", "Pistola"]) &&
    one(e.ammo, ["Compacta", "Média", "Longa"]) &&
    one(e.sight, ["Mira aberta", "Luneta"]) &&
    str(e.name, 150) &&
    (e.velocity === undefined || num(e.velocity, 1, 10000))
  );
}
export function validDrill(d: unknown): d is Drill {
  return (
    obj(d) &&
    str(d.id, 150) &&
    exercises.some((e) => e.id === d.exerciseId) &&
    integer(d.sets, 1, 50) &&
    integer(d.seconds, 1, 3600) &&
    integer(d.reps, 1, 1000) &&
    one(d.mode, ["time", "reps"]) &&
    integer(d.prep, 0, 600) &&
    integer(d.rest, 0, 600) &&
    distance(d.distance) &&
    (d.meters === undefined || num(d.meters, 1, 2000)) &&
    ["start", "side", "amplitude", "order", "rhythm"].every((k) =>
      str(d[k], 200),
    ) &&
    integer(d.targets, exerciseById(d.exerciseId as string).targets, 10)
  );
}
export function validRoutine(r: unknown): r is Routine {
  return (
    obj(r) &&
    str(r.id, 150) &&
    str(r.name, 150) &&
    typeof r.name === "string" &&
    r.name.trim().length > 0 &&
    str(r.description) &&
    one(r.objective, ["Aquecimento", "Treino dedicado"]) &&
    diff(r.difficulty) &&
    distance(r.distance) &&
    one(r.category, [
      "Mista",
      "Tracking",
      "Flick",
      "Microajuste",
      "Antecipação",
      "Transição",
    ]) &&
    validEquipment(r.equipment) &&
    typeof r.custom === "boolean" &&
    Array.isArray(r.drills) &&
    r.drills.length > 0 &&
    r.drills.length <= 50 &&
    r.drills.every(validDrill) &&
    new Set(r.drills.map((d) => d.id)).size === r.drills.length
  );
}
export function validResult(r: unknown): boolean {
  return (
    obj(r) &&
    str(r.drillId, 150) &&
    exercises.some((e) => e.id === r.exerciseId) &&
    distance(r.distance) &&
    (r.meters === undefined || num(r.meters, 1, 2000)) &&
    validEquipment(r.equipment) &&
    diff(r.difficulty) &&
    str(r.note) &&
    (r.reps === undefined || integer(r.reps, 0, 100000)) &&
    (r.attempts === undefined || integer(r.attempts, 1, 100000)) &&
    (r.hits === undefined ||
      (integer(r.hits, 0, 100000) &&
        typeof r.attempts === "number" &&
        (r.hits as number) <= r.attempts))
  );
}
function validSkillMs(v: unknown) {
  return (
    obj(v) &&
    Object.entries(v).every(
      ([k, n]) =>
        one(k, [
          "Tracking",
          "Flick",
          "Microajuste",
          "Antecipação",
          "Transição",
        ]) && num(n, 0, 1e12),
    )
  );
}
function validSession(s: unknown): s is Session {
  if (
    !obj(s) ||
    !validRoutine(s.routine) ||
    !str(s.id, 150) ||
    !str(s.startedAt, 50) ||
    !Number.isFinite(Date.parse(s.startedAt as string)) ||
    !Array.isArray(s.phases)
  )
    return false;
  const plan = phases(s.routine);
  const routine = s.routine;
  return (
    JSON.stringify(plan) === JSON.stringify(s.phases) &&
    integer(s.phase, 0, plan.length) &&
    num(s.remainingMs, -1e12, 3600000) &&
    (s.deadline === null || num(s.deadline, 0, 1e15)) &&
    typeof s.running === "boolean" &&
    typeof s.waiting === "boolean" &&
    typeof s.skipped === "boolean" &&
    num(s.elapsedMs, 0, 1e12) &&
    num(s.activeMs, 0, 1e12) &&
    validSkillMs(s.skillMs) &&
    Array.isArray(s.performed) &&
    s.performed.every((id) => routine.drills.some((d) => d.id === id)) &&
    Array.isArray(s.results) &&
    s.results.every(validResult)
  );
}
export function parseBackup(value: unknown): Store {
  if (
    !obj(value) ||
    value.version !== 1 ||
    !Array.isArray(value.routines) ||
    value.routines.length > 500 ||
    !value.routines.every(validRoutine) ||
    new Set(value.routines.map((r) => r.id)).size !== value.routines.length ||
    !Array.isArray(value.history) ||
    value.history.length > 10000
  )
    throw new Error("Backup inválido: formato ou rotinas incompatíveis.");
  for (const h of value.history) {
    if (
      !obj(h) ||
      !str(h.id, 150) ||
      !str(h.date, 50) ||
      !Number.isFinite(Date.parse(h.date as string)) ||
      !num(h.duration, 0, 1e12) ||
      !num(h.active, 0, 1e12) ||
      !str(h.name, 150) ||
      !diff(h.difficulty) ||
      !validEquipment(h.equipment) ||
      !one(h.status, ["Completa", "Parcial", "Cancelada"]) ||
      !str(h.notes) ||
      !integer(h.effort, 1, 5) ||
      !Array.isArray(h.exercises) ||
      !h.exercises.every((id) => exercises.some((e) => e.id === id)) ||
      !validSkillMs(h.skillMs) ||
      !Array.isArray(h.results) ||
      !h.results.every(validResult)
    )
      throw new Error("Backup inválido: histórico inconsistente.");
  }
  const p = value.preferences;
  if (
    !obj(p) ||
    typeof p.sound !== "boolean" ||
    !num(p.volume, 0, 1) ||
    typeof p.autoAdvance !== "boolean" ||
    typeof p.movingTarget !== "boolean" ||
    (value.session !== null && !validSession(value.session))
  )
    throw new Error("Backup inválido: preferências ou sessão incompatíveis.");
  return value as Store;
}
export function loadStore(storage: Pick<Storage, "getItem">): {
  data: Store;
  error: string;
} {
  try {
    const raw = storage.getItem(KEY);
    return {
      data: raw ? parseBackup(JSON.parse(raw)) : freshStore(),
      error: "",
    };
  } catch {
    return {
      data: freshStore(),
      error:
        "Não foi possível ler os dados locais. O conteúdo anterior foi preservado. Exporte ou restaure um backup antes de salvar novos dados.",
    };
  }
}
export function saveStore(
  storage: Pick<Storage, "setItem">,
  data: Store,
): string {
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return "";
  } catch {
    return "Não foi possível salvar neste navegador. Exporte um backup para preservar os dados desta sessão.";
  }
}
export function accuracy(hits?: number, attempts?: number): number | null {
  return hits !== undefined &&
    attempts !== undefined &&
    Number.isInteger(hits) &&
    Number.isInteger(attempts) &&
    attempts > 0 &&
    hits >= 0 &&
    hits <= attempts
    ? (hits / attempts) * 100
    : null;
}
