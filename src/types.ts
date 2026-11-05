export type Difficulty = "Fácil" | "Média" | "Difícil";
export type Skill =
  | "Tracking"
  | "Flick"
  | "Microajuste"
  | "Antecipação"
  | "Transição";
export type Distance = "Curta" | "Média" | "Longa" | "Mista";
export type Equipment = {
  type: "Arma principal" | "Pistola";
  ammo: "Compacta" | "Média" | "Longa";
  sight: "Mira aberta" | "Luneta";
  name: string;
  velocity?: number;
};
export type Exercise = {
  id: string;
  name: string;
  skill: Skill;
  summary: string;
  steps: string[];
  mistakes: string;
  criterion: string;
  mobile?: boolean;
  targets: number;
  alternative?: string;
};
export type Drill = {
  id: string;
  exerciseId: string;
  sets: number;
  seconds: number;
  reps: number;
  mode: "time" | "reps";
  prep: number;
  rest: number;
  distance: Distance;
  meters?: number;
  start: string;
  side: string;
  amplitude: string;
  order: string;
  targets: number;
  rhythm: string;
};
export type Routine = {
  id: string;
  name: string;
  description: string;
  objective: "Aquecimento" | "Treino dedicado";
  difficulty: Difficulty;
  distance: Distance;
  category: Skill | "Mista";
  equipment: Equipment;
  drills: Drill[];
  custom: boolean;
  advertisedMinutes?: number;
};
export type Phase = {
  kind: "prep" | "work" | "rest";
  seconds: number;
  drillIndex: number;
  set: number;
};
export type Session = {
  id: string;
  routine: Routine;
  phases: Phase[];
  phase: number;
  remainingMs: number;
  deadline: number | null;
  running: boolean;
  startedAt: string;
  elapsedMs: number;
  activeMs: number;
  skillMs: Partial<Record<Skill, number>>;
  performed: string[];
  skipped: boolean;
  waiting: boolean;
  results: Result[];
};
export type Result = {
  drillId: string;
  exerciseId: string;
  distance: Distance;
  meters?: number;
  equipment: Equipment;
  difficulty: Difficulty;
  attempts?: number;
  hits?: number;
  reps?: number;
  note: string;
};
export type RecordEntry = {
  id: string;
  date: string;
  duration: number;
  active: number;
  name: string;
  difficulty: Difficulty;
  equipment: Equipment;
  status: "Completa" | "Parcial" | "Cancelada";
  notes: string;
  effort: number;
  exercises: string[];
  skillMs: Partial<Record<Skill, number>>;
  results: Result[];
};
export type Preferences = {
  sound: boolean;
  volume: number;
  autoAdvance: boolean;
  movingTarget: boolean;
};
export type Store = {
  version: 1;
  routines: Routine[];
  history: RecordEntry[];
  preferences: Preferences;
  session: Session | null;
};
