import type {
  Difficulty,
  Drill,
  Equipment,
  Exercise,
  Routine,
} from "./types.ts";

export const equipment: Equipment = {
  type: "Arma principal",
  ammo: "Compacta",
  sight: "Mira aberta",
  name: "",
};
export const exercises: Exercise[] = [
  {
    id: "strafe",
    name: "Tracking com movimento do jogador",
    skill: "Tracking",
    summary:
      "Ande lateralmente mantendo a mira na cabeça de um alvo parado. Sem disparar.",
    steps: [
      "Escolha uma cabeça visível e uma área livre para andar.",
      "Mova seu personagem para os lados e compense com a mira.",
      "Inverta a direção suavemente; repita sem disparar.",
    ],
    mistakes:
      "Movimentos bruscos, acelerar até perder o alvo ou usar tiros para corrigir a mira.",
    criterion:
      "Mantenha a mira sobre a cabeça com movimento contínuo e confortável.",
    targets: 1,
  },
  {
    id: "moving",
    name: "Tracking de alvo em movimento",
    skill: "Tracking",
    summary:
      "Acompanhe a cabeça de um alvo móvel, sem disparar e sem antecipar.",
    steps: [
      "Use apenas se houver um alvo móvel adequado no estande.",
      "Fique parado e acompanhe a cabeça durante o deslocamento.",
      "Observe a inversão de direção e ajuste suavemente.",
    ],
    mistakes:
      "Mirar à frente da cabeça, confundir acompanhamento com antecipação ou forçar um alvo inexistente.",
    criterion: "A mira acompanha a cabeça sem saltos. Não há disparos.",
    targets: 1,
    mobile: true,
    alternative: "strafe",
  },
  {
    id: "lead",
    name: "Antecipação de disparo",
    skill: "Antecipação",
    summary:
      "Posicione a mira à frente do alvo móvel e ajuste o próximo tiro com base na observação.",
    steps: [
      "Encontre um alvo móvel adequado; mantenha a mesma arma e distância na série.",
      "Observe direção e ritmo. Posicione a mira à frente do alvo antes de atirar.",
      "Confirme o ajuste e dispare. Observe o resultado e ajuste gradualmente.",
      "Ao mudar distância ou arma, reavalie a antecipação. Não existe valor universal.",
    ],
    mistakes:
      "Aplicar uma antecipação fixa ou deduzir velocidade apenas pelo tipo de munição.",
    criterion:
      "Use tentativas controladas e compare apenas condições semelhantes. Respeite a cadência da arma.",
    targets: 1,
    mobile: true,
    alternative: "strafe",
  },
  {
    id: "vertical",
    name: "Flick vertical para a cabeça",
    skill: "Flick",
    summary:
      "Parta do ponto indicado, ajuste até a cabeça e confirme a mira antes do tiro.",
    steps: [
      "Posicione a mira na mão, cotovelo, ombro, virilha ou peito, conforme a variante.",
      "Faça um movimento controlado até a cabeça.",
      "Confirme o ajuste antes de disparar; precisão vem primeiro.",
      "Volte ao mesmo ponto inicial e reinicie.",
    ],
    mistakes:
      "Atirar durante o movimento, passar da cabeça ou não retornar ao ponto inicial.",
    criterion:
      "Termine cada movimento na cabeça com controle. Reduza o ritmo se precisar corrigir muito.",
    targets: 1,
  },
  {
    id: "micro",
    name: "Microajustes laterais",
    skill: "Microajuste",
    summary:
      "Comece ligeiramente ao lado da cabeça e faça uma correção curta e precisa.",
    steps: [
      "Posicione a mira à esquerda ou à direita da cabeça, usando a amplitude indicada.",
      "Corrija lateralmente até o centro da cabeça.",
      "Confirme a mira, dispare se desejar e reposicione para a próxima repetição.",
    ],
    mistakes:
      "Aumentar a amplitude sem perceber, oscilar ou acelerar antes de estabilizar.",
    criterion:
      "Chegue à cabeça em uma correção curta, sem oscilações repetidas.",
    targets: 1,
  },
  {
    id: "fine",
    name: "Flick com correção fina",
    skill: "Flick",
    summary:
      "Suba do peito ou da virilha e conclua o ajuste lateral antes de disparar.",
    steps: [
      "Comece no peito ou na virilha do alvo.",
      "Suba até a região da cabeça.",
      "Faça a pequena correção lateral necessária e confirme.",
      "Dispare e retorne ao ponto inicial.",
    ],
    mistakes:
      "Disparar antes da correção lateral ou transformar a sequência em movimentos apressados.",
    criterion:
      "Separe o movimento inicial da correção final até conseguir controle.",
    targets: 1,
  },
  {
    id: "transition",
    name: "Transição entre alvos",
    skill: "Transição",
    summary:
      "Alterne entre as cabeças dos alvos disponíveis, estabilizando em cada chegada.",
    steps: [
      "Escolha pelo menos dois alvos disponíveis e defina a ordem.",
      "Mova a mira entre as cabeças seguindo a sequência indicada.",
      "Confirme cada chegada antes de disparar; retorne ao primeiro alvo.",
    ],
    mistakes:
      "Exigir mais alvos do que existem ou atirar antes de estabilizar a mira.",
    criterion:
      "Complete a sequência com chegadas controladas; velocidade é secundária.",
    targets: 2,
  },
  {
    id: "pistol",
    name: "Precisão com pistola",
    skill: "Microajuste",
    summary:
      "Faça microajustes e primeiros disparos controlados, respeitando o ritmo da sua pistola.",
    steps: [
      "Equipe a pistola que pretende usar e escolha uma cabeça parada.",
      "Comece ligeiramente ao lado da cabeça e ajuste com calma.",
      "Confirme o ajuste e faça um disparo. Aguarde a recuperação da arma.",
      "Reposicione e repita em ritmo confortável para essa pistola.",
    ],
    mistakes:
      "Usar o mesmo ritmo de outra arma, compensar pressa com mais tiros ou ignorar a recuperação.",
    criterion:
      "Cada disparo parte de uma mira confirmada. As repetições são uma referência, não uma obrigação de cadência.",
    targets: 1,
  },
];
export const exerciseById = (id: string) => exercises.find((e) => e.id === id)!;
export const uid = () => crypto.randomUUID();
export function makeDrill(exerciseId: string, seconds = 60): Drill {
  return {
    id: uid(),
    exerciseId,
    sets: 2,
    seconds,
    reps: exerciseId === "pistol" ? 6 : 10,
    mode: "time",
    prep: 15,
    rest: 15,
    distance: "Média",
    start: "Peito",
    side: "Alternar",
    amplitude: "Pequena",
    order: "Fixa",
    targets: exerciseById(exerciseId).targets,
    rhythm: "Confortável; confirme a mira",
  };
}
const presets: [
  string,
  string,
  number,
  string[],
  Routine["objective"],
  Routine["category"],
  Routine["distance"],
][] = [
  [
    "quick",
    "Aquecimento rápido",
    5,
    ["strafe", "vertical", "micro"],
    "Aquecimento",
    "Mista",
    "Curta",
  ],
  [
    "warm",
    "Aquecimento completo",
    10,
    ["strafe", "vertical", "micro", "transition"],
    "Aquecimento",
    "Mista",
    "Mista",
  ],
  [
    "flick",
    "Flick e microajustes",
    15,
    ["vertical", "fine", "micro"],
    "Treino dedicado",
    "Flick",
    "Média",
  ],
  [
    "track",
    "Treino de tracking",
    15,
    ["strafe", "moving", "strafe"],
    "Treino dedicado",
    "Tracking",
    "Mista",
  ],
  [
    "lead",
    "Treino de antecipação",
    10,
    ["lead", "lead", "lead"],
    "Treino dedicado",
    "Antecipação",
    "Mista",
  ],
  [
    "pistol",
    "Treino de pistola",
    10,
    ["pistol", "vertical", "transition"],
    "Treino dedicado",
    "Microajuste",
    "Curta",
  ],
  [
    "range",
    "Média e longa distância",
    20,
    ["strafe", "micro", "fine", "transition"],
    "Treino dedicado",
    "Mista",
    "Mista",
  ],
  [
    "full",
    "Treino completo de mira",
    30,
    ["strafe", "vertical", "micro", "moving", "lead", "transition"],
    "Treino dedicado",
    "Mista",
    "Mista",
  ],
];
export function defaults(): Routine[] {
  return presets.map(
    ([id, name, minutes, ids, objective, category, distance]) => {
      const sets = objective === "Aquecimento" ? 1 : 2;
      const overhead = ids.length * 15 + (ids.length * sets - 1) * 15;
      const work = minutes * 60 - overhead;
      const count = ids.length * sets;
      // Distribute whole seconds across drills; all declared durations close exactly.
      const base = Math.floor(work / count);
      const remainder = work - base * count;
      let extra = Math.floor(remainder / sets);
      const drills = ids.map((ex, i) => ({
        ...makeDrill(ex),
        id: `${id}-${i}`,
        seconds: base + (extra-- > 0 ? 1 : 0),
        sets,
        distance:
          distance === "Mista"
            ? ((i % 2 ? "Longa" : "Média") as Drill["distance"])
            : distance,
      }));
      drills[0].prep += remainder % sets;
      if (id === "pistol")
        drills.forEach((d) => {
          d.reps = 6;
          d.rhythm =
            "Confirme a mira e aguarde a recuperação da sua pistola entre disparos";
        });
      return {
        id,
        name,
        description:
          objective === "Aquecimento"
            ? "Prepare a mão e encontre um ritmo confortável antes da próxima caçada."
            : `Uma sessão concentrada em ${category === "Mista" ? "controle de mira e consistência" : category.toLowerCase()}, com pausas para recuperar a precisão.`,
        objective,
        difficulty: "Média",
        distance,
        category,
        equipment: {
          ...equipment,
          type: id === "pistol" ? "Pistola" : "Arma principal",
        },
        drills,
        custom: false,
        advertisedMinutes: minutes,
      };
    },
  );
}
export function variant(r: Routine, difficulty: Difficulty): Routine {
  return {
    ...r,
    difficulty,
    distance:
      difficulty === "Fácil"
        ? "Curta"
        : difficulty === "Difícil"
          ? "Longa"
          : r.distance,
    drills: r.drills.map((d) => ({
      ...d,
      distance:
        difficulty === "Fácil"
          ? "Curta"
          : difficulty === "Difícil"
            ? "Longa"
            : d.distance,
      meters: difficulty === r.difficulty ? d.meters : undefined,
      amplitude:
        difficulty === "Fácil"
          ? "Pequena"
          : difficulty === "Difícil"
            ? "Variada"
            : "Média",
      side: difficulty === "Fácil" ? "Esquerda" : "Alternar",
      order: difficulty === "Difícil" ? "Alternada" : "Fixa",
      rhythm:
        (r.equipment.type === "Pistola"
          ? "Aguarde a recuperação da sua pistola; "
          : "") +
        (difficulty === "Fácil"
          ? "Lento; estabilize em cada chegada"
          : difficulty === "Difícil"
            ? "Ágil apenas com precisão; reduza se perder controle"
            : "Confortável; confirme a mira"),
      reps:
        r.equipment.type === "Pistola"
          ? difficulty === "Fácil"
            ? 4
            : difficulty === "Difícil"
              ? 8
              : 6
          : difficulty === "Fácil"
            ? 6
            : difficulty === "Difícil"
              ? 12
              : 10,
    })),
  };
}
