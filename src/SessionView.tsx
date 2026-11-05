import { useState, type FormEvent } from "react";
import { exerciseById } from "./data.ts";
import {
  accuracy,
  advance,
  clock,
  pause,
  phases,
  reconcile,
  resume,
  validResult,
} from "./core.ts";
import type { RecordEntry, Result, Session, Preferences } from "./types.ts";
import { equipmentText, Icon } from "./ui.tsx";
let audio: AudioContext | null = null;
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
  } catch {
    /* Browser may not support audio. */
  }
}
export function cue(volume: number, kind: string) {
  if (!audio || audio.state !== "running") return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "work" ? 740 : kind === "rest" ? 440 : 550;
    gain.gain.setValueAtTime(0, audio.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.22, audio.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.45);
  } catch {
    /* Timer still works if sound is unavailable. */
  }
}
export function SessionView({
  s,
  setSession,
  preferences: p,
  setPreferences,
  finish,
}: {
  s: Session;
  setSession: (s: Session) => void;
  preferences: Preferences;
  setPreferences: (p: Preferences) => void;
  finish: (h: RecordEntry) => void;
}) {
  const [ending, setEnding] = useState(false);
  const [notes, setNotes] = useState("");
  const [effort, setEffort] = useState(3);
  const [error, setError] = useState("");
  const [draftResults, setDraftResults] = useState(s.results);
  const done = s.phase >= s.phases.length;
  const phase = s.phases[s.phase];
  const d = phase
    ? s.routine.drills[phase.drillIndex]
    : s.routine.drills.at(-1)!;
  const ex = exerciseById(d.exerciseId);
  const nextPhase = s.phases.slice(s.phase + 1).find((x) => x.kind === "work");
  const next = nextPhase ? s.routine.drills[nextPhase.drillIndex] : null;
  function toggle() {
    unlockAudio();
    setSession(s.running ? pause(s, Date.now(), p.autoAdvance) : resume(s));
    if (!s.running && p.sound) cue(p.volume, phase?.kind ?? "prep");
  }
  function result(drillId: string): Result {
    const drill = s.routine.drills.find((x) => x.id === drillId)!;
    return (
      draftResults.find((x) => x.drillId === drillId) ?? {
        drillId,
        exerciseId: drill.exerciseId,
        distance: drill.distance,
        meters: drill.meters,
        equipment: s.routine.equipment,
        difficulty: s.routine.difficulty,
        note: "",
      }
    );
  }
  function updateResult(id: string, changes: Partial<Result>) {
    const next = { ...result(id), ...changes };
    setDraftResults([...draftResults.filter((x) => x.drillId !== id), next]);
    if (validResult(next))
      setSession({
        ...s,
        results: [...s.results.filter((x) => x.drillId !== id), next],
      });
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!draftResults.every(validResult)) {
      setError(
        "Informe tentativas maiores que zero e acertos entre zero e o total de tentativas, ou deixe os campos vazios.",
      );
      return;
    }
    finish({
      id: s.id,
      date: s.startedAt,
      duration: s.elapsedMs / 1000,
      active: s.activeMs / 1000,
      name: s.routine.name,
      difficulty: s.routine.difficulty,
      equipment: s.routine.equipment,
      status:
        done && !s.skipped
          ? "Completa"
          : s.performed.length
            ? "Parcial"
            : "Cancelada",
      notes,
      effort,
      exercises: s.routine.drills
        .filter((x) => s.performed.includes(x.id))
        .map((x) => x.exerciseId),
      skillMs: s.skillMs,
      results: draftResults.filter((x) => s.performed.includes(x.drillId)),
    });
  }
  const resultFields = (id: string) => {
    const r = result(id);
    return (
      <div className="form-grid result-fields">
        <label>
          Repetições realizadas
          <input
            type="number"
            min="0"
            max="100000"
            value={r.reps ?? ""}
            onChange={(e) =>
              updateResult(id, {
                reps:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Tentativas
          <input
            type="number"
            min="1"
            max="100000"
            value={r.attempts ?? ""}
            onChange={(e) =>
              updateResult(id, {
                attempts:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Acertos
          <input
            type="number"
            min="0"
            max={r.attempts ?? 100000}
            value={r.hits ?? ""}
            onChange={(e) =>
              updateResult(id, {
                hits:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Nota do exercício
          <input
            maxLength={2000}
            value={r.note}
            onChange={(e) => updateResult(id, { note: e.target.value })}
          />
        </label>
        {accuracy(r.hits, r.attempts) !== null && (
          <p className="accent">
            {accuracy(r.hits, r.attempts)!.toFixed(1)}% de acerto informado
          </p>
        )}
      </div>
    );
  };
  if (done || ending)
    return (
      <section className="finish-panel">
        <div className="eyebrow">CADERNO DE TREINO / REGISTRO</div>
        <h1>
          {done && !s.skipped ? "Sessão concluída." : "Cada sessão conta."}
        </h1>
        <p className="muted">
          Registre o que observou. Resultados são opcionais e sempre informados
          por você.
        </p>
        <div className="stats-inline">
          <div>
            <strong>{clock(s.elapsedMs / 1000)}</strong>
            <span>tempo acompanhado</span>
          </div>
          <div>
            <strong>{clock(s.activeMs / 1000)}</strong>
            <span>tempo ativo</span>
          </div>
          <div>
            <strong>{s.performed.length}</strong>
            <span>exercícios realizados</span>
          </div>
        </div>
        <form onSubmit={save}>
          {s.routine.drills
            .filter((x) => s.performed.includes(x.id))
            .map((drill, i) => (
              <details key={drill.id} className="result-detail">
                <summary>
                  {i + 1}. {exerciseById(drill.exerciseId).name}{" "}
                  <span className="muted">
                    · {drill.distance.toLowerCase()}
                    {drill.meters ? ` ≈ ${drill.meters} m` : ""}
                  </span>
                </summary>
                {resultFields(drill.id)}
              </details>
            ))}
          <div className="form-grid">
            <label>
              Como foi a dificuldade?
              <select
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
              >
                <option value="1">1 · Muito leve</option>
                <option value="2">2 · Leve</option>
                <option value="3">3 · Adequada</option>
                <option value="4">4 · Exigente</option>
                <option value="5">5 · Muito exigente</option>
              </select>
            </label>
            <label>
              Observações
              <textarea
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="O que você percebeu na sua mira?"
              />
            </label>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button type="submit" className="button primary">
              Salvar no histórico <Icon name="check" />
            </button>
            {!done && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setEnding(false)}
              >
                Voltar à sessão pausada
              </button>
            )}
          </div>
        </form>
      </section>
    );
  const total = phases(s.routine).reduce((a, b) => a + b.seconds, 0);
  const remaining =
    Math.max(0, s.remainingMs / 1000) +
    s.phases.slice(s.phase + 1).reduce((a, b) => a + b.seconds, 0);
  const percent = Math.min(100, ((total - remaining) / total) * 100);
  const isWork = phase.kind === "work";
  return (
    <section className="session-page">
      <div className="row between">
        <div>
          <div className="eyebrow">SESSÃO EM ANDAMENTO</div>
          <h1>{s.routine.name}</h1>
        </div>
        <button
          className="icon-button"
          aria-label="Alternar tela cheia"
          onClick={() => {
            const action = document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen?.();
            action?.catch(() =>
              setError("Tela cheia indisponível neste navegador."),
            );
          }}
        >
          <Icon name="expand" />
        </button>
      </div>
      <div className="session-layout">
        <div className={`timer-panel ${phase.kind}`}>
          <div className="row between">
            <span className="badge">
              {phase.kind === "prep"
                ? "Prepare-se"
                : phase.kind === "rest"
                  ? "Intervalo"
                  : s.running
                    ? "Em execução"
                    : "Pronto / pausado"}
            </span>
            <span className="muted small">
              Série {phase.set} de {d.sets}
            </span>
          </div>
          <div
            className="timer"
            role="timer"
            aria-label={`${clock(s.remainingMs / 1000)} restantes`}
          >
            {clock(s.remainingMs / 1000)}
          </div>
          <p className="timer-state">
            {s.waiting
              ? "Confirme a série quando terminar"
              : !s.running
                ? "O cronômetro está pausado"
                : phase.kind === "rest"
                  ? "Relaxe a mão. Respire."
                  : phase.kind === "prep"
                    ? "Encontre o alvo e ajuste sua posição."
                    : d.mode === "reps"
                      ? `${d.reps} repetições previstas · tempo estimado`
                      : "Precisão antes de velocidade."}
          </p>
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="row between small muted">
            <span>
              Sessão
              {s.routine.drills.some((x) => x.mode === "reps")
                ? " · estimativa"
                : ""}
            </span>
            <span>{clock(remaining)} restantes</span>
          </div>
          <div className="timer-controls">
            <button className="button primary" onClick={toggle}>
              <Icon name={s.running ? "pause" : "play"} />
              {s.running ? "Pausar" : s.elapsedMs ? "Retomar" : "Iniciar"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                const current = reconcile(s, Date.now(), p.autoAdvance);
                setSession(
                  advance(
                    {
                      ...current,
                      skipped:
                        current.skipped ||
                        current.phases[current.phase]?.kind === "work",
                    },
                    Date.now(),
                  ),
                );
              }}
            >
              <Icon name="skip" />
              Pular etapa
            </button>
          </div>
          {isWork && (d.mode === "reps" || !p.autoAdvance) && (
            <button
              className="button confirm-series"
              onClick={() =>
                setSession(advance(reconcile(s, Date.now(), p.autoAdvance)))
              }
            >
              <Icon name="check" /> Confirmar série
            </button>
          )}
          <div className="row between timer-bottom">
            <button
              className="text-button"
              onClick={() => {
                if (
                  confirm(
                    "Reiniciar a sessão? O progresso atual será descartado.",
                  )
                ) {
                  setDraftResults([]);
                  setSession({
                    ...s,
                    phase: 0,
                    remainingMs: s.phases[0].seconds * 1000,
                    running: false,
                    deadline: null,
                    elapsedMs: 0,
                    activeMs: 0,
                    skillMs: {},
                    performed: [],
                    skipped: false,
                    waiting: false,
                    results: [],
                    startedAt: new Date().toISOString(),
                  });
                }
              }}
            >
              <Icon name="repeat" size={16} />
              Reiniciar
            </button>
            <button
              className="text-button danger"
              onClick={() => {
                setSession(pause(s, Date.now(), p.autoAdvance));
                setEnding(true);
              }}
            >
              Encerrar sessão
            </button>
          </div>
        </div>
        <aside className="current-drill">
          <div className="eyebrow">
            {phase.kind === "rest" ? "ÚLTIMO EXERCÍCIO" : "EXERCÍCIO ATUAL"}
          </div>
          <h2>{ex.name}</h2>
          <p>{ex.summary}</p>
          <div className="drill-meta">
            <span>
              {d.distance}
              {d.meters ? ` · ≈ ${d.meters} m` : " · referência livre"}
            </span>
            <span>{equipmentText(s.routine.equipment)}</span>
            <span>
              {d.reps} repetições de referência por série · {d.targets} alvo
              {d.targets > 1 ? "s" : ""}
            </span>
            <span>
              {d.start} · {d.side.toLowerCase()} · amplitude{" "}
              {d.amplitude.toLowerCase()} · ordem {d.order.toLowerCase()}
            </span>
            <span>{d.rhythm}</span>
          </div>
          <details>
            <summary>Instruções completas</summary>
            <ol>
              {ex.steps.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            <p>
              <strong>Evite:</strong> {ex.mistakes}
            </p>
            <p>
              <strong>Critério:</strong> {ex.criterion}
            </p>
          </details>
          <div className="up-next">
            <span className="eyebrow">A SEGUIR</span>
            <p>
              {next
                ? `${exerciseById(next.exerciseId).name} · série ${nextPhase!.set}`
                : "Registro da sessão"}
            </p>
          </div>
        </aside>
      </div>
      {phase.kind === "rest" && (
        <details className="result-detail">
          <summary>Registrar resultados deste exercício (opcional)</summary>
          <p className="muted small">
            Informe totais acumulados do exercício, somando suas séries. Você
            também pode preencher ao final.
          </p>
          {resultFields(d.id)}
        </details>
      )}
      <div className="session-options">
        <label className="check-label">
          <input
            type="checkbox"
            checked={p.sound}
            onChange={(e) => {
              unlockAudio();
              setPreferences({ ...p, sound: e.target.checked });
            }}
          />{" "}
          Avisos sonoros
        </label>
        <label className="volume">
          <Icon name="volume" size={17} />
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={p.volume}
            onChange={(e) =>
              setPreferences({ ...p, volume: Number(e.target.value) })
            }
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={p.autoAdvance}
            onChange={(e) => {
              setSession(pause(s, Date.now(), p.autoAdvance));
              setPreferences({ ...p, autoAdvance: e.target.checked });
            }}
          />{" "}
          Avançar automaticamente por tempo
        </label>
      </div>
      <p className="muted small">
        Espaço: pausar / retomar quando esta página estiver em foco. Áudio e
        execução em segundo plano dependem do navegador; o relógio é
        reconciliado ao voltar. O áudio não funciona com o dispositivo suspenso.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
