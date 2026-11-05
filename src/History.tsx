import { useState } from "react";
import { accuracy, clock } from "./core.ts";
import { exerciseById } from "./data.ts";
import { equipmentText, Icon } from "./ui.tsx";
import type { RecordEntry, Result, Skill } from "./types.ts";
export function comparable(a: Result, b: Result) {
  return (
    a.exerciseId === b.exerciseId &&
    a.distance === b.distance &&
    a.meters === b.meters &&
    a.difficulty === b.difficulty &&
    a.equipment.type === b.equipment.type &&
    a.equipment.ammo === b.equipment.ammo &&
    a.equipment.sight === b.equipment.sight &&
    a.equipment.name.trim().toLowerCase() ===
      b.equipment.name.trim().toLowerCase() &&
    a.equipment.velocity === b.equipment.velocity
  );
}
export function WeekStats({ history }: { history: RecordEntry[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const week = history.filter((h) => Date.parse(h.date) >= start.getTime());
  return (
    <div className="week-stats">
      <div className="week-title">
        <Icon name="chart" size={20} />
        <span>SEU RITMO NESTA SEMANA</span>
      </div>
      <div className="week-value">
        <strong>
          {Math.round(week.reduce((a, h) => a + h.active, 0) / 60)}
        </strong>
        <span>minutos ativos</span>
      </div>
      <div className="week-value">
        <strong>
          {week
            .filter((h) => h.status === "Completa")
            .length.toString()
            .padStart(2, "0")}
        </strong>
        <span>sessões concluídas</span>
      </div>
      <p>
        Consistência começa com
        <br />
        uma sessão de cada vez.
      </p>
    </div>
  );
}
export function History({
  history,
  remove,
}: {
  history: RecordEntry[];
  remove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [skill, setSkill] = useState("Todas");
  const [since, setSince] = useState("");
  const [difficulty, setDifficulty] = useState("Todas");
  const filtered = history.filter(
    (h) =>
      h.name.toLowerCase().includes(query.toLowerCase()) &&
      (status === "Todos" || h.status === status) &&
      (difficulty === "Todas" || h.difficulty === difficulty) &&
      (!since || h.date >= new Date(`${since}T00:00:00`).toISOString()) &&
      (skill === "Todas" ||
        h.exercises.some((id) => exerciseById(id).skill === skill)),
  );
  const skills: Skill[] = [
    "Tracking",
    "Flick",
    "Microajuste",
    "Antecipação",
    "Transição",
  ];
  const totals = skills.map((name) => ({
    name,
    value: filtered.reduce((a, h) => a + (h.skillMs[name] ?? 0), 0),
  }));
  const sum = totals.reduce((a, x) => a + x.value, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEU CADERNO</div>
          <h1>Tempo bem investido.</h1>
          <p className="muted">
            O registro da sua prática. A evolução da mira vai além dos minutos.
          </p>
        </div>
      </div>
      <WeekStats history={history} />
      <div className="filters history-filters">
        <label>
          Buscar sessão
          <input
            placeholder="Nome da rotina"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["Todos", "Completa", "Parcial", "Cancelada"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Habilidade
          <select value={skill} onChange={(e) => setSkill(e.target.value)}>
            {["Todas", ...skills].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Dificuldade
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {["Todas", "Fácil", "Média", "Difícil"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          A partir de
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </label>
      </div>
      <section className="distribution">
        <h3>Tempo ativo por habilidade</h3>
        {totals.map((x) => (
          <div key={x.name} className="skill-bar">
            <span>{x.name}</span>
            <div className="progress-track">
              <span style={{ width: `${sum ? (x.value / sum) * 100 : 0}%` }} />
            </div>
            <span>{clock(x.value / 1000)}</span>
          </div>
        ))}
        <p className="muted small">
          Distribuição dos registros filtrados. Tempo de prática não comprova
          melhora de mira.
        </p>
      </section>
      <div className="section-title">
        <h2>Histórico de sessões</h2>
        <span className="muted small">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </span>
      </div>
      {!filtered.length && (
        <div className="empty">
          <Icon name="book" size={35} />
          <h3>Uma página em branco.</h3>
          <p>
            Suas sessões aparecerão aqui depois de salvar o primeiro treino.
          </p>
        </div>
      )}
      {filtered.map((h) => (
        <details className="history-entry" key={h.id}>
          <summary>
            <div>
              <strong>{h.name}</strong>
              <span>
                {new Date(h.date).toLocaleString("pt-BR")} · {h.difficulty}
              </span>
            </div>
            <span className="badge">{h.status}</span>
            <span>{clock(h.duration)}</span>
          </summary>
          <div className="history-body">
            <p>{equipmentText(h.equipment)}</p>
            <p>
              {clock(h.active)} ativos · esforço percebido: {h.effort}/5
            </p>
            <p>{h.notes || "Sem observações."}</p>
            <p className="muted small">
              Exercícios realizados:{" "}
              {h.exercises.map((id) => exerciseById(id).name).join(", ") ||
                "Nenhum"}
            </p>
            {h.results.map((r, i) => {
              const pct = accuracy(r.hits, r.attempts);
              const prior = history
                .filter((x) => Date.parse(x.date) < Date.parse(h.date))
                .flatMap((x) => x.results)
                .filter(
                  (x) =>
                    comparable(r, x) && accuracy(x.hits, x.attempts) !== null,
                );
              const a = prior.reduce((n, x) => n + x.attempts!, 0);
              const hits = prior.reduce((n, x) => n + x.hits!, 0);
              return (
                <div className="comparison" key={i}>
                  <strong>
                    {exerciseById(r.exerciseId).name} · {r.distance}
                    {r.meters ? ` ≈ ${r.meters} m` : ""}
                  </strong>
                  <p>
                    {r.reps === undefined
                      ? "Repetições não informadas"
                      : `${r.reps} repetições informadas`}
                    {pct !== null
                      ? ` · ${r.hits}/${r.attempts} acertos (${pct.toFixed(1)}%)`
                      : " · sem percentual de acerto"}
                  </p>
                  {pct !== null && a > 0 ? (
                    <p className="small muted">
                      Registros anteriores em condições semelhantes:{" "}
                      {((hits / a) * 100).toFixed(1)}% ({hits}/{a}). Diferença:{" "}
                      {(pct - (hits / a) * 100).toFixed(1)} pontos percentuais.
                      Comparação descritiva; ritmo e amplitude podem variar.
                    </p>
                  ) : (
                    <p className="small muted">
                      Sem comparação válida anterior para este exercício,
                      dificuldade, distância e equipamento.
                    </p>
                  )}
                  {r.note && <p>{r.note}</p>}
                </div>
              );
            })}
            <button
              className="text-button danger"
              onClick={() => {
                if (confirm("Excluir este registro do histórico?"))
                  remove(h.id);
              }}
            >
              Excluir registro
            </button>
          </div>
        </details>
      ))}
    </>
  );
}
