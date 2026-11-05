import { useEffect, useRef, type ReactNode } from "react";
import type { Equipment } from "./types.ts";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v5m0 12v5M1 12h5m12 0h5" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    book: (
      <>
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 15l4-5 4 3 5-8" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m9 3 1-1h4l1 4 3 1 3 2-2 3 1 4-3 2-3-1-3 4-3-2v-4l-4-1v-4l4-2Z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    play: <path d="m8 4 12 8-12 8Z" />,
    pause: (
      <>
        <path d="M8 4v16M16 4v16" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L20 5" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
    volume: (
      <>
        <path d="M3 9h4l5-4v14l-5-4H3Zm13-1q5 4 0 8m3-12q9 8 0 16" />
      </>
    ),
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5" />,
    repeat: (
      <>
        <path d="M4 10a8 8 0 1 1 1 7M4 3v7h7" />
      </>
    ),
    skip: (
      <>
        <path d="m5 5 11 7-11 7ZM20 5v14" />
      </>
    ),
    pin: (
      <>
        <path d="m4 20 16-16M4 4l16 16M4 4v6m0-6h6m10 16h-6m6 0v-6" />
      </>
    ),
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.target}
    </svg>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const d = ref.current!;
    d.showModal();
    return () => {
      d.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EquipmentFields({
  value,
  onChange,
}: {
  value: Equipment;
  onChange: (e: Equipment) => void;
}) {
  const set = (k: string, v: string | number | undefined) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="form-grid">
      <label>
        Tipo de arma
        <select
          value={value.type}
          onChange={(e) => set("type", e.target.value)}
        >
          <option>Arma principal</option>
          <option>Pistola</option>
        </select>
      </label>
      <label>
        Munição
        <select
          value={value.ammo}
          onChange={(e) => set("ammo", e.target.value)}
        >
          <option>Compacta</option>
          <option>Média</option>
          <option>Longa</option>
        </select>
      </label>
      <label>
        Mira
        <select
          value={value.sight}
          onChange={(e) => set("sight", e.target.value)}
        >
          <option>Mira aberta</option>
          <option>Luneta</option>
        </select>
      </label>
      <label>
        Nome da arma (opcional)
        <input
          maxLength={150}
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Qual arma você usa?"
        />
      </label>
      <label>
        Velocidade em m/s (opcional)
        <input
          type="number"
          min="1"
          max="10000"
          value={value.velocity ?? ""}
          onChange={(e) =>
            set("velocity", e.target.value ? Number(e.target.value) : undefined)
          }
          placeholder="Consulte sua arma no jogo"
        />
      </label>
    </div>
  );
}
export const equipmentText = (e: Equipment) =>
  `${e.name || e.type} · ${e.ammo.toLowerCase()} · ${e.sight.toLowerCase()}${e.velocity ? ` · ${e.velocity} m/s` : ""}`;
