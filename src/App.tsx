import { useEffect, useRef, useState } from "react";
import {
  activeDuration,
  clock,
  duration,
  estimated,
  KEY,
  loadStore,
  parseBackup,
  pause,
  reconcile,
  recover,
  resume,
  saveStore,
  startSession,
} from "./core.ts";
import {
  defaults,
  equipment,
  exerciseById,
  exercises,
  uid,
  variant,
} from "./data.ts";
import type { Difficulty, Routine, Session, Store } from "./types.ts";
import { Icon, Modal, equipmentText, EquipmentFields } from "./ui.tsx";
import { Editor } from "./Editor.tsx";
import { History, WeekStats } from "./History.tsx";
import { cue, SessionView, unlockAudio } from "./SessionView.tsx";
type Page = "routines" | "library" | "history" | "settings" | "session";
function initial() {
  try {
    const loaded = loadStore(localStorage);
    if (loaded.data.session)
      loaded.data.session = recover(
        loaded.data.session,
        Date.now(),
        loaded.data.preferences.autoAdvance,
      );
    return loaded;
  } catch {
    return loadStore({
      getItem() {
        throw new Error("storage unavailable");
      },
    });
  }
}
export default function App() {
  const [loaded] = useState(initial);
  const [data, setData] = useState(loaded.data);
  const [storageBlocked, setStorageBlocked] = useState(!!loaded.error);
  const [error, setError] = useState(loaded.error);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState<Page>("routines");
  const [selected, setSelected] = useState<Routine | null>(null);
  const [editor, setEditor] = useState<{ routine: Routine | null } | null>(
    null,
  );
  const [time, setTime] = useState("0");
  const [objective, setObjective] = useState("Todos");
  const [difficulty, setDifficulty] = useState("Todas");
  const [distance, setDistance] = useState("Todas");
  const [weapon, setWeapon] = useState("Todos");
  const [search, setSearch] = useState("");
  const [pendingImport, setPendingImport] = useState<Store | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previousPhase = useRef(data.session?.phase);
  const patch = (changes: Partial<Store>) =>
    setData((d) => ({ ...d, ...changes }));
  const setSession = (session: Session) => patch({ session });
  useEffect(() => {
    if (!storageBlocked) {
      let message: string;
      try {
        message = saveStore(localStorage, data);
      } catch {
        message = "Armazenamento indisponível. Exporte um backup.";
      }
      if (message) setError(message);
    }
  }, [data, storageBlocked]);
  useEffect(() => {
    const tick = () =>
      setData((d) => {
        if (!d.session?.running) return d;
        return {
          ...d,
          session: reconcile(d.session, Date.now(), d.preferences.autoAdvance),
        };
      });
    const interval = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);
  useEffect(() => {
    if (
      data.session?.phase !== previousPhase.current &&
      data.preferences.sound &&
      data.session
    )
      cue(
        data.preferences.volume,
        data.session.phases[data.session.phase]?.kind ?? "rest",
      );
    previousPhase.current = data.session?.phase;
  }, [data.session?.phase]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code !== "Space" ||
        page !== "session" ||
        !data.session ||
        document.querySelector("dialog[open]") ||
        /INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY/.test(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      e.preventDefault();
      unlockAudio();
      setSession(
        data.session.running
          ? pause(data.session, Date.now(), data.preferences.autoAdvance)
          : resume(data.session),
      );
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [page, data.session, data.preferences.autoAdvance]);
  function navigate(to: Page) {
    if (data.session?.running && to !== "session")
      setSession(pause(data.session, Date.now(), data.preferences.autoAdvance));
    setPage(to);
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hunt-mira-backup-${new Date().toLocaleDateString("en-CA")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("O backup deve ter no máximo 10 MB.");
      setPendingImport(parseBackup(JSON.parse(await file.text())));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arquivo inválido.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  function launch(r: Routine) {
    if (
      data.session &&
      !confirm(
        "Uma sessão está salva. Deseja descartá-la e iniciar esta rotina?",
      )
    )
      return;
    let resolved = structuredClone(r);
    if (!data.preferences.movingTarget)
      resolved = {
        ...resolved,
        drills: resolved.drills.map((d) =>
          exerciseById(d.exerciseId).mobile
            ? { ...d, exerciseId: "strafe" }
            : d,
        ),
      };
    // Set up paused: browser audio is unlocked by the explicit start gesture.
    patch({ session: startSession(resolved) });
    setSelected(null);
    setPage("session");
  }
  const quick = data.routines.find((r) => r.id === "quick") ?? defaults()[0];
  const filtered = data.routines
    .map((r) =>
      difficulty !== "Todas" && !r.custom
        ? variant(r, difficulty as Difficulty)
        : r,
    )
    .filter(
      (r) =>
        (!Number(time) || duration(r) <= Number(time) * 60) &&
        (objective === "Todos" || r.objective === objective) &&
        (difficulty === "Todas" || r.difficulty === difficulty || !r.custom) &&
        (distance === "Todas" || r.distance === distance) &&
        (weapon === "Todos" || r.equipment.type === weapon) &&
        r.name.toLowerCase().includes(search.toLowerCase()),
    );
  const pages: [Page, string, string][] = [
    ["routines", "Rotinas de treino", "grid"],
    ["library", "Exercícios", "target"],
    ["history", "Meu progresso", "chart"],
    ["settings", "Preferências", "settings"],
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#content">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("routines");
          }}
        >
          <div className="brand-symbol">
            <Icon name="target" size={31} />
          </div>
          <div>
            <strong>
              HUNT<span> / </span>AIM
            </strong>
            <small>CADERNO DE MIRA</small>
          </div>
        </a>
        <div className="sidebar-label">SEU CAMPO DE TREINO</div>
        <nav aria-label="Navegação principal">
          {pages.map(([id, label, icon]) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => navigate(id)}
            >
              <Icon name={icon} />
              {label}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
          {data.session && (
            <button
              className={`nav-item ${page === "session" ? "active" : ""}`}
              onClick={() => navigate("session")}
            >
              <Icon name="play" />
              Sessão salva
              <span className="nav-dot" />
            </button>
          )}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-cross">✧</span>
          <p>
            Uma mira consistente.
            <br />
            Um disparo de cada vez.
          </p>
          <div className="small muted">
            Feito para acompanhar
            <br />
            seu treino no estande.
          </div>
        </div>
        <div className="local-status">
          <span /> DADOS SALVOS NESTE NAVEGADOR
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="topbar-mark">/</span> ESTANDE DE TIRO{" "}
            <span className="topbar-separator">/</span>{" "}
            {page === "session"
              ? "SESSÃO"
              : pages.find((p) => p[0] === page)?.[1].toUpperCase()}
          </div>
          <span className="offline-label">
            <span /> SEM INTEGRAÇÃO COM O JOGO
          </span>
        </header>
        <main id="content">
          {error && (
            <div className="banner error" role="alert">
              <span>{error}</span>
              <button className="text-button" onClick={() => setError("")}>
                Fechar
              </button>
            </div>
          )}
          {notice && (
            <div className="banner" role="status">
              {notice}
              <button className="text-button" onClick={() => setNotice("")}>
                Fechar
              </button>
            </div>
          )}
          {data.session && page !== "session" && (
            <div className="banner">
              <span>
                <strong>Seu treino está salvo.</strong> Retome quando estiver
                pronto; o cronômetro está pausado.
              </span>
              <button
                className="button secondary small-button"
                onClick={() => navigate("session")}
              >
                Abrir sessão <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
          {page === "routines" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PRECISÃO É PRÁTICA.</div>
                  <h1>
                    Prepare a mira.
                    <br />
                    <em>Encontre seu ritmo.</em>
                  </h1>
                  <p className="muted">
                    Rotinas para aquecer, treinar e voltar à caçada.
                    <br />
                    Você cuida dos disparos. A gente cuida do tempo.
                  </p>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="scope-circle">
                    <div className="scope-inner" />
                    <div className="scope-cross-h" />
                    <div className="scope-cross-v" />
                    <span className="scope-center" />
                    <span className="scope-number top">N / 01</span>
                    <span className="scope-number bottom">
                      FOCO · CONTROLE · PRECISÃO
                    </span>
                  </div>
                </div>
              </div>
              <div className="quick-start">
                <div className="quick-icon">
                  <Icon name="play" size={22} />
                </div>
                <div>
                  <div className="eyebrow">POUCO TEMPO? COMECE POR AQUI.</div>
                  <strong>Aquecimento rápido</strong>
                  <span className="muted">
                    {clock(duration(quick))} para entrar no ritmo.
                  </span>
                </div>
                <button
                  className="button primary"
                  onClick={() => setSelected(quick)}
                >
                  Preparar aquecimento <Icon name="arrow" size={17} />
                </button>
              </div>
              <div className="section-title">
                <div>
                  <h2>
                    Escolha seu treino{" "}
                    <span className="count">
                      {data.routines.length.toString().padStart(2, "0")}
                    </span>
                  </h2>
                  <p className="muted small">
                    Seu objetivo, seu tempo, sua próxima sessão.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setEditor({ routine: null })}
                >
                  <Icon name="plus" size={18} />
                  Criar rotina
                </button>
              </div>
              <div className="filters">
                <label>
                  Tempo disponível
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  >
                    <option value="0">Qualquer duração</option>
                    {[5, 10, 15, 20, 30].map((n) => (
                      <option value={n} key={n}>
                        Até {n} minutos
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Objetivo
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                  >
                    {["Todos", "Aquecimento", "Treino dedicado"].map((x) => (
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
                  Distância
                  <select
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                  >
                    {["Todas", "Curta", "Média", "Longa", "Mista"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Equipamento
                  <select
                    value={weapon}
                    onChange={(e) => setWeapon(e.target.value)}
                  >
                    {["Todos", "Arma principal", "Pistola"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="row between result-count">
                <span className="muted small">
                  {filtered.length} rotinas disponíveis
                </span>
                <input
                  aria-label="Buscar rotina"
                  className="search"
                  placeholder="Buscar rotina..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="routine-grid">
                {filtered.map((base, i) => {
                  const r = base;
                  return (
                    <article className="routine-card" key={r.id}>
                      <div className="row between">
                        <span
                          className={`routine-label ${r.objective === "Aquecimento" ? "warmup" : ""}`}
                        >
                          {r.objective}
                        </span>
                        <span className="card-index">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="card-skill-icon">
                        <Icon
                          name={
                            r.category === "Tracking"
                              ? "repeat"
                              : r.category === "Microajuste"
                                ? "pin"
                                : "target"
                          }
                          size={32}
                        />
                      </div>
                      <h3>{r.name}</h3>
                      <p>{r.description}</p>
                      <div className="tags">
                        <span>{r.difficulty}</span>
                        <span>{r.distance}</span>
                        <span>
                          {r.equipment.type === "Pistola"
                            ? "Pistola"
                            : r.category}
                        </span>
                      </div>
                      <div className="card-footer">
                        <div>
                          <Icon name="clock" size={17} />
                          <strong>
                            {Math.floor(duration(r) / 60)}
                            <small> min{estimated(r) ? " ≈" : ""}</small>
                          </strong>
                          <span>{r.drills.length} exercícios</span>
                        </div>
                        <button
                          className="card-open"
                          aria-label={`Ver rotina ${r.name}`}
                          onClick={() => setSelected(r)}
                        >
                          <Icon name="arrow" size={21} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!filtered.length && (
                <div className="empty">
                  <h3>Nenhuma rotina com esses filtros.</h3>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTime("0");
                      setObjective("Todos");
                      setDifficulty("Todas");
                      setDistance("Todas");
                      setWeapon("Todos");
                      setSearch("");
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
              <WeekStats history={data.history} />
              <p className="footnote">
                Sugestões iniciais editáveis. Pratique com conforto e faça
                pausas. Não há promessa de melhora garantida.
              </p>
            </>
          )}
          {page === "library" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">O FUNDAMENTO DE CADA DISPARO</div>
                  <h1>
                    Conheça o exercício.
                    <br />
                    <em>Treine com intenção.</em>
                  </h1>
                  <p className="muted">
                    Instruções concretas para usar no estande, no seu ritmo.
                  </p>
                </div>
              </div>
              <div className="library-grid">
                {exercises.map((ex, i) => (
                  <article className="exercise-card" key={ex.id}>
                    <span className="eyebrow">
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {ex.skill.toUpperCase()}
                    </span>
                    <h2>{ex.name}</h2>
                    <p>{ex.summary}</p>
                    <div className="tags">
                      <span>
                        {ex.targets}+ alvo{ex.targets > 1 ? "s" : ""}
                      </span>
                      <span>
                        {ex.mobile ? "Exige alvo móvel" : "Alvos parados"}
                      </span>
                      <span>Curta / média / longa</span>
                    </div>
                    <ol>
                      {ex.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    <p className="guidance">
                      <strong>Erros comuns</strong>
                      {ex.mistakes}
                    </p>
                    <p className="guidance">
                      <strong>Critério de execução</strong>
                      {ex.criterion}
                    </p>
                    {ex.mobile && (
                      <div className="inline-warning">
                        Sem alvo móvel? Use tracking com movimento do jogador
                        como alternativa. Ele treina a compensação do seu
                        deslocamento; não substitui tracking de alvo móvel ou
                        antecipação.
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
          {page === "history" && (
            <History
              history={data.history}
              remove={(id) =>
                patch({ history: data.history.filter((h) => h.id !== id) })
              }
            />
          )}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DO SEU JEITO</div>
                  <h1>Prepare seu espaço.</h1>
                  <p className="muted">
                    Preferências, dados e as pequenas coisas que ajudam a manter
                    o foco.
                  </p>
                </div>
              </div>
              <section className="settings-panel">
                <h2>Durante o treino</h2>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={data.preferences.sound}
                    onChange={(e) => {
                      unlockAudio();
                      patch({
                        preferences: {
                          ...data.preferences,
                          sound: e.target.checked,
                        },
                      });
                    }}
                  />{" "}
                  Avisos sonoros de preparação, início e término
                </label>
                <label className="volume">
                  Volume
                  <input
                    aria-label="Volume dos avisos"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={data.preferences.volume}
                    onChange={(e) =>
                      patch({
                        preferences: {
                          ...data.preferences,
                          volume: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <button
                    className="text-button"
                    onClick={() => {
                      unlockAudio();
                      cue(data.preferences.volume, "work");
                    }}
                  >
                    Testar som
                  </button>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={data.preferences.autoAdvance}
                    onChange={(e) => {
                      if (data.session)
                        setSession(
                          pause(
                            data.session,
                            Date.now(),
                            data.preferences.autoAdvance,
                          ),
                        );
                      setData((d) => ({
                        ...d,
                        preferences: {
                          ...d.preferences,
                          autoAdvance: e.target.checked,
                        },
                      }));
                    }}
                  />{" "}
                  Avançar automaticamente nas séries por tempo
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={data.preferences.movingTarget}
                    onChange={(e) =>
                      patch({
                        preferences: {
                          ...data.preferences,
                          movingTarget: e.target.checked,
                        },
                      })
                    }
                  />{" "}
                  Tenho um alvo móvel adequado disponível no estande
                </label>
                <p className="muted small">
                  Sem alvo móvel, os exercícios que dependem dele usam tracking
                  com movimento do jogador. Essa alternativa trabalha outra
                  habilidade; antecipação exige alvo em movimento.
                </p>
              </section>
              <section className="settings-panel">
                <h2>Seus dados ficam com você.</h2>
                <p>
                  Rotinas, preferências, sessão e histórico são salvos apenas
                  neste navegador. Não existe sincronização automática entre
                  dispositivos. Limpar os dados do navegador apaga os registros
                  locais.
                </p>
                <div className="row">
                  <button className="button secondary" onClick={exportBackup}>
                    <Icon name="download" />
                    Exportar backup JSON
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => fileRef.current?.click()}
                  >
                    Importar backup
                  </button>
                  <input
                    ref={fileRef}
                    className="sr-only"
                    type="file"
                    accept=".json,application/json"
                    aria-label="Arquivo de backup"
                    onChange={(e) => void importFile(e.target.files?.[0])}
                  />
                </div>
                {storageBlocked && (
                  <button
                    className="text-button danger"
                    onClick={() => {
                      if (
                        confirm(
                          "Substituir os dados locais ilegíveis pelos dados atualmente abertos? Exporte um backup antes, se necessário.",
                        )
                      ) {
                        setStorageBlocked(false);
                        setError("");
                      }
                    }}
                  >
                    Liberar gravação e substituir dados locais ilegíveis
                  </button>
                )}
              </section>
              <section className="settings-panel">
                <h2>Um recomeço para as rotinas.</h2>
                <p>
                  Restaure as oito sugestões iniciais. Suas rotinas
                  personalizadas e seu histórico serão preservados.
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (
                      confirm(
                        "Restaurar as rotinas padrão? Edições feitas nas sugestões iniciais serão substituídas.",
                      )
                    ) {
                      patch({
                        routines: [
                          ...defaults(),
                          ...data.routines.filter((r) => r.custom),
                        ],
                      });
                      setNotice("Rotinas padrão restauradas.");
                    }
                  }}
                >
                  Restaurar rotinas padrão
                </button>
              </section>
              <section className="settings-panel">
                <h2>Uso e acessibilidade</h2>
                <p>
                  Na sessão, use Espaço para pausar ou retomar quando a página
                  estiver em foco. Tab navega entre controles e Enter ativa o
                  item selecionado. Os atalhos não são globais e não funcionam
                  enquanto o jogo está em foco.
                </p>
                <p>
                  Inicie a sessão com um clique para permitir áudio. Navegadores
                  podem suspender sons e execução em segundo plano. Ao voltar à
                  página, o relógio usa o horário real para atualizar as etapas.
                  Ao reabrir uma sessão salva, ela permanece pausada para sua
                  confirmação.
                </p>
                <p className="muted small">
                  Projeto independente. Sem afiliação com Hunt: Showdown ou uso
                  de materiais oficiais.
                </p>
              </section>
            </>
          )}
          {page === "session" && data.session && (
            <SessionView
              s={data.session}
              setSession={setSession}
              preferences={data.preferences}
              setPreferences={(preferences) => patch({ preferences })}
              finish={(h) => {
                patch({ history: [h, ...data.history], session: null });
                setPage("history");
                setNotice("Sessão registrada no seu caderno.");
              }}
            />
          )}
          <footer className="main-footer">
            <span>
              HUNT / AIM <span className="muted">— CADERNO DE MIRA</span>
            </span>
            <span>FOCO NO PROCESSO.</span>
          </footer>
        </main>
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)} wide>
          <p className="muted">{selected.description}</p>
          <div className="detail-controls">
            <label>
              Dificuldade
              <select
                value={selected.difficulty}
                onChange={(e) =>
                  setSelected({
                    ...variant(
                      data.routines.find((r) => r.id === selected.id) ??
                        selected,
                      e.target.value as Difficulty,
                    ),
                    equipment: selected.equipment,
                  })
                }
              >
                <option>Fácil</option>
                <option>Média</option>
                <option>Difícil</option>
              </select>
            </label>
            <div>
              <strong>{clock(duration(selected))}</strong>
              <span>
                {" "}
                {estimated(selected) ? "estimados" : "totais"} ·{" "}
                {clock(activeDuration(selected))} ativos
              </span>
            </div>
          </div>
          <p className="small muted">
            Preparação antes de cada exercício e descanso entre séries e
            exercícios incluídos. Em séries por tempo, repetições são apenas
            referências.
          </p>
          <details className="equipment-details">
            <summary>Equipamento · {equipmentText(selected.equipment)}</summary>
            <EquipmentFields
              value={selected.equipment}
              onChange={(v) => setSelected({ ...selected, equipment: v })}
            />
            <p className="small muted">
              Ajustes aqui valem para esta sessão. Use Editar para salvar na
              rotina.
            </p>
          </details>
          <label className="check-label moving-target-check">
            <input
              type="checkbox"
              checked={data.preferences.movingTarget}
              onChange={(e) =>
                patch({
                  preferences: {
                    ...data.preferences,
                    movingTarget: e.target.checked,
                  },
                })
              }
            />{" "}
            Tenho alvo móvel adequado disponível
          </label>
          {selected.drills.some((d) => exerciseById(d.exerciseId).mobile) &&
            !data.preferences.movingTarget && (
              <p className="inline-warning">
                Sem alvo móvel: usaremos tracking com movimento do jogador nas
                etapas que exigem movimento do alvo. A duração será mantida, mas
                essa alternativa trabalha outra habilidade e não treina
                antecipação.
              </p>
            )}
          <div className="detail-drills">
            {selected.drills.map((d, i) => (
              <details key={d.id}>
                <summary>
                  <span className="sequence-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{exerciseById(d.exerciseId).name}</strong>
                    <span>
                      {d.sets} ×{" "}
                      {d.mode === "time"
                        ? clock(d.seconds)
                        : `${d.reps} repetições (≈ ${clock(d.seconds)})`}{" "}
                      · {d.distance.toLowerCase()}
                      {d.meters ? ` ≈ ${d.meters} m` : ""}
                    </span>
                  </div>
                  <Icon name="plus" size={16} />
                </summary>
                <div className="detail-body">
                  <p>{exerciseById(d.exerciseId).summary}</p>
                  <p>
                    {d.start} · lado: {d.side.toLowerCase()} · amplitude:{" "}
                    {d.amplitude.toLowerCase()} · ordem: {d.order.toLowerCase()}{" "}
                    · {d.targets} alvo(s)
                  </p>
                  <p>
                    {d.rhythm}. {d.reps} repetições de referência por série.
                  </p>
                  <p className="small muted">
                    Preparação {d.prep}s · descanso {d.rest}s (sem descanso ao
                    final da rotina).
                  </p>
                  <ol>
                    {exerciseById(d.exerciseId).steps.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ol>
                  <p>
                    <strong>Evite:</strong>{" "}
                    {exerciseById(d.exerciseId).mistakes}
                  </p>
                  <p>
                    <strong>Critério:</strong>{" "}
                    {exerciseById(d.exerciseId).criterion}
                  </p>
                </div>
              </details>
            ))}
          </div>
          <div className="modal-actions">
            <button className="button primary" onClick={() => launch(selected)}>
              <Icon name="play" />
              Ir para sessão
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setEditor({ routine: selected });
                setSelected(null);
              }}
            >
              Editar
            </button>
            <button
              className="text-button"
              onClick={() => {
                setEditor({
                  routine: {
                    ...selected,
                    id: uid(),
                    name: `${selected.name} (cópia)`,
                    custom: true,
                    advertisedMinutes: undefined,
                  },
                });
                setSelected(null);
              }}
            >
              Duplicar
            </button>
            <button
              className="text-button danger"
              onClick={() => {
                if (
                  confirm("Excluir esta rotina? O histórico será preservado.")
                ) {
                  patch({
                    routines: data.routines.filter((r) => r.id !== selected.id),
                  });
                  setSelected(null);
                }
              }}
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
      {editor && (
        <Editor
          routine={editor.routine}
          onClose={() => setEditor(null)}
          onSave={(r) => {
            patch({
              routines: data.routines.some((x) => x.id === r.id)
                ? data.routines.map((x) => (x.id === r.id ? r : x))
                : [...data.routines, r],
            });
            setEditor(null);
            setNotice("Rotina salva no seu navegador.");
          }}
        />
      )}
      {pendingImport && (
        <Modal
          title="Substituir os dados deste navegador?"
          onClose={() => setPendingImport(null)}
        >
          <p>
            O backup foi validado: {pendingImport.routines.length} rotinas e{" "}
            {pendingImport.history.length} sessões. A importação substituirá
            suas rotinas, preferências, histórico e sessão atuais.
          </p>
          <p className="muted">
            Exporte os dados atuais antes de continuar, caso queira
            preservá-los.
          </p>
          <div className="row">
            <button className="button secondary" onClick={exportBackup}>
              Exportar dados atuais
            </button>
            <button
              className="button primary"
              onClick={() => {
                const imported = {
                  ...pendingImport,
                  session: pendingImport.session
                    ? recover(
                        pendingImport.session,
                        Date.now(),
                        pendingImport.preferences.autoAdvance,
                      )
                    : null,
                };
                setStorageBlocked(false);
                setData(imported);
                setPendingImport(null);
                setError("");
                setNotice(
                  "Backup importado. Sessões recuperadas ficam pausadas.",
                );
              }}
            >
              Confirmar substituição
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
