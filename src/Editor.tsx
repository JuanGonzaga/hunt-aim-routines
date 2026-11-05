import { useState, type FormEvent } from "react";
import { equipment, exercises, makeDrill, uid, exerciseById } from "./data.ts";
import {
  activeDuration,
  clock,
  duration,
  estimated,
  validRoutine,
} from "./core.ts";
import type { Drill, Routine } from "./types.ts";
import { EquipmentFields, Icon, Modal } from "./ui.tsx";
export function Editor({
  routine,
  onSave,
  onClose,
}: {
  routine: Routine | null;
  onSave: (r: Routine) => void;
  onClose: () => void;
}) {
  const [r, setR] = useState<Routine>(() =>
    routine
      ? structuredClone(routine)
      : {
          id: uid(),
          name: "",
          description: "",
          objective: "Treino dedicado",
          difficulty: "Média",
          distance: "Média",
          category: "Mista",
          equipment: { ...equipment },
          drills: [makeDrill("strafe")],
          custom: true,
        },
  );
  const [error, setError] = useState("");
  const update = <K extends keyof Routine>(k: K, value: Routine[K]) =>
    setR({ ...r, [k]: value });
  function drill(i: number, changes: Partial<Drill>) {
    update(
      "drills",
      r.drills.map((d, j) => (i === j ? { ...d, ...changes } : d)),
    );
  }
  function move(i: number, by: number) {
    const a = [...r.drills];
    [a[i], a[i + by]] = [a[i + by], a[i]];
    update("drills", a);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...r, name: r.name.trim(), advertisedMinutes: undefined };
    if (!validRoutine(next))
      return setError(
        "Revise os campos: inclua um nome e ao menos um exercício, com séries e tempos válidos.",
      );
    onSave(next);
  }
  return (
    <Modal
      title={routine ? "Editar rotina" : "Sua próxima rotina"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="span-2">
            Nome
            <input
              required
              maxLength={150}
              value={r.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Dê um nome ao seu treino"
            />
          </label>
          <label className="span-2">
            Descrição
            <textarea
              maxLength={2000}
              value={r.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label>
            Objetivo
            <select
              value={r.objective}
              onChange={(e) =>
                update("objective", e.target.value as Routine["objective"])
              }
            >
              <option>Aquecimento</option>
              <option>Treino dedicado</option>
            </select>
          </label>
          <label>
            Dificuldade
            <select
              value={r.difficulty}
              onChange={(e) =>
                update("difficulty", e.target.value as Routine["difficulty"])
              }
            >
              <option>Fácil</option>
              <option>Média</option>
              <option>Difícil</option>
            </select>
          </label>
          <label>
            Distância geral
            <select
              value={r.distance}
              onChange={(e) =>
                update("distance", e.target.value as Routine["distance"])
              }
            >
              {["Curta", "Média", "Longa", "Mista"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select
              value={r.category}
              onChange={(e) =>
                update("category", e.target.value as Routine["category"])
              }
            >
              {[
                "Mista",
                "Tracking",
                "Flick",
                "Microajuste",
                "Antecipação",
                "Transição",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <h3>Equipamento recomendado</h3>
        <EquipmentFields
          value={r.equipment}
          onChange={(v) => update("equipment", v)}
        />
        <p className="muted small">
          A munição não determina sozinha a velocidade do projétil. Distâncias
          em metros são referências suas.
        </p>
        <h3>Sequência de exercícios</h3>
        {r.drills.map((d, i) => (
          <fieldset key={d.id} className="drill-editor">
            <legend>
              {String(i + 1).padStart(2, "0")} ·{" "}
              {exerciseById(d.exerciseId).name}
            </legend>
            <div className="row end">
              <button
                type="button"
                className="text-button"
                disabled={!i}
                onClick={() => move(i, -1)}
                aria-label={`Subir exercício ${i + 1}`}
              >
                ↑ Subir
              </button>
              <button
                type="button"
                className="text-button"
                disabled={i === r.drills.length - 1}
                onClick={() => move(i, 1)}
                aria-label={`Descer exercício ${i + 1}`}
              >
                ↓ Descer
              </button>
              <button
                type="button"
                className="text-button danger"
                onClick={() =>
                  update(
                    "drills",
                    r.drills.filter((_, j) => j !== i),
                  )
                }
              >
                Remover
              </button>
            </div>
            <div className="form-grid">
              <label className="span-2">
                Exercício
                <select
                  value={d.exerciseId}
                  onChange={(e) =>
                    drill(i, {
                      exerciseId: e.target.value,
                      targets: exerciseById(e.target.value).targets,
                    })
                  }
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Modo
                <select
                  value={d.mode}
                  onChange={(e) =>
                    drill(i, { mode: e.target.value as Drill["mode"] })
                  }
                >
                  <option value="time">Por tempo</option>
                  <option value="reps">
                    Por repetições (confirmação manual)
                  </option>
                </select>
              </label>
              <label>
                Séries
                <input
                  required
                  type="number"
                  min="1"
                  max="50"
                  value={d.sets}
                  onChange={(e) => drill(i, { sets: Number(e.target.value) })}
                />
              </label>
              <label>
                {d.mode === "reps"
                  ? "Tempo estimado por série (s)"
                  : "Tempo por série (s)"}
                <input
                  required
                  type="number"
                  min="1"
                  max="3600"
                  value={d.seconds}
                  onChange={(e) =>
                    drill(i, { seconds: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Repetições previstas por série
                <input
                  required
                  type="number"
                  min="1"
                  max="1000"
                  value={d.reps}
                  onChange={(e) => drill(i, { reps: Number(e.target.value) })}
                />
              </label>
              <label>
                Preparação antes do exercício (s)
                <input
                  required
                  type="number"
                  min="0"
                  max="600"
                  value={d.prep}
                  onChange={(e) => drill(i, { prep: Number(e.target.value) })}
                />
              </label>
              <label>
                Descanso entre séries / exercícios (s)
                <input
                  required
                  type="number"
                  min="0"
                  max="600"
                  value={d.rest}
                  onChange={(e) => drill(i, { rest: Number(e.target.value) })}
                />
              </label>
              <label>
                Distância
                <select
                  value={d.distance}
                  onChange={(e) =>
                    drill(i, { distance: e.target.value as Drill["distance"] })
                  }
                >
                  {["Curta", "Média", "Longa", "Mista"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Referência em metros (opcional)
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={d.meters ?? ""}
                  onChange={(e) =>
                    drill(i, {
                      meters: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </label>
              <label>
                Ponto inicial
                <select
                  value={d.start}
                  onChange={(e) => drill(i, { start: e.target.value })}
                >
                  {["Mão", "Cotovelo", "Ombro", "Virilha", "Peito"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Lado
                <select
                  value={d.side}
                  onChange={(e) => drill(i, { side: e.target.value })}
                >
                  {["Esquerda", "Direita", "Alternar"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Amplitude inicial
                <select
                  value={d.amplitude}
                  onChange={(e) => drill(i, { amplitude: e.target.value })}
                >
                  {["Pequena", "Média", "Variada"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Ordem dos alvos
                <select
                  value={d.order}
                  onChange={(e) => drill(i, { order: e.target.value })}
                >
                  <option>Fixa</option>
                  <option>Alternada</option>
                </select>
              </label>
              <label>
                Alvos necessários
                <input
                  type="number"
                  required
                  min={exerciseById(d.exerciseId).targets}
                  max="10"
                  value={d.targets}
                  onChange={(e) =>
                    drill(i, { targets: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Ritmo sugerido
                <input
                  maxLength={200}
                  value={d.rhythm}
                  onChange={(e) => drill(i, { rhythm: e.target.value })}
                />
              </label>
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() => update("drills", [...r.drills, makeDrill("vertical")])}
        >
          <Icon name="plus" /> Adicionar exercício
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <div>
            <strong>{clock(duration(r))}</strong>{" "}
            {estimated(r) ? "estimados" : "totais"}{" "}
            <span className="muted">· {clock(activeDuration(r))} ativos</span>
          </div>
          <button className="button primary" type="submit">
            Salvar rotina <Icon name="check" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
