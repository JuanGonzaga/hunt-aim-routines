import { test, expect } from "@playwright/test";
import { defaults, makeDrill } from "../../src/data.ts";
import { freshStore, KEY } from "../../src/core.ts";

test("restart clears results and skipped work remains partial", async ({
  page,
}) => {
  const store = freshStore();
  store.routines = [
    {
      ...defaults()[0],
      name: "Reinício",
      drills: [
        {
          ...makeDrill("micro"),
          mode: "reps",
          prep: 0,
          seconds: 1,
          sets: 2,
          rest: 20,
        },
      ],
    },
  ];
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: KEY, value: store },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ver rotina Reinício", exact: true })
    .click();
  await page.getByRole("button", { name: "Ir para sessão" }).click();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(
    page.getByText("Confirme a série quando terminar"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar série" }).click();
  await page.locator(".result-detail summary").click();
  await page.getByLabel("Tentativas", { exact: true }).fill("5");
  await page.getByLabel("Acertos", { exact: true }).fill("4");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(
    page.getByText("Confirme a série quando terminar"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar série" }).click();
  await page.locator(".result-detail summary").click();
  await expect(page.getByLabel("Tentativas", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Acertos", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Pular etapa" }).click();
  await page.getByRole("button", { name: "Pular etapa" }).click();
  await page.getByRole("button", { name: "Salvar no histórico" }).click();
  await expect(page.locator(".history-entry")).toContainText("Parcial");
});
test("choose routine, inspect explicit difficulty changes and start warmup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Prepare a mira/ }),
  ).toBeVisible();
  await expect(page.locator(".routine-card")).toHaveCount(8);
  await page.getByLabel("Tempo disponível").selectOption("5");
  await expect(page.locator(".routine-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Preparar aquecimento" }).click();
  await expect(page.getByRole("dialog")).toContainText("05:00");
  await page
    .getByRole("dialog")
    .getByLabel("Dificuldade")
    .selectOption("Difícil");
  await page
    .getByRole("dialog")
    .locator(".detail-drills summary")
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("amplitude: variada");
  await page.getByRole("button", { name: "Ir para sessão" }).click();
  await expect(page.getByRole("timer")).toHaveText("00:15");
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pausar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /Abrir sessão/ }).click();
  await expect(page.getByText("O cronômetro está pausado")).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("create, duplicate, reorder, edit and delete a persisted custom routine", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar rotina", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Controle diário");
  await dialog.getByRole("button", { name: "Adicionar exercício" }).click();
  await dialog.getByRole("button", { name: "Subir exercício 2" }).click();
  await expect(dialog.locator("legend").first()).toContainText(
    "Flick vertical",
  );
  await dialog.getByRole("button", { name: "Salvar rotina" }).click();
  await page.reload();
  await expect(page.locator(".routine-card")).toHaveCount(9);
  await page
    .getByRole("button", { name: "Ver rotina Controle diário", exact: true })
    .click();
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar rotina" })
    .click();
  await expect(page.locator(".routine-card")).toHaveCount(10);
  await page
    .getByRole("button", {
      name: "Ver rotina Controle diário (cópia)",
      exact: true,
    })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.locator(".routine-card")).toHaveCount(9);
});
test("complete a real timed session and manually register valid results", async ({
  page,
}) => {
  const store = freshStore();
  store.routines = [
    {
      ...defaults()[0],
      id: "test-short",
      name: "Sessão de verificação",
      custom: true,
      drills: [
        { ...makeDrill("micro"), seconds: 2, prep: 1, sets: 1, rest: 0 },
      ],
    },
  ];
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(value));
    },
    { key: KEY, value: store },
  );
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Ver rotina Sessão de verificação",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Ir para sessão" }).click();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sessão concluída." }),
  ).toBeVisible({ timeout: 7000 });
  await page.locator(".result-detail summary").click();
  await page.getByLabel("Tentativas", { exact: true }).fill("10");
  await page.getByLabel("Acertos", { exact: true }).fill("7");
  await expect(page.getByText("70.0% de acerto informado")).toBeVisible();
  await page
    .getByLabel("Observações", { exact: true })
    .fill("Controle confortável.");
  await page.getByRole("button", { name: "Salvar no histórico" }).click();
  await expect(page.locator(".history-entry")).toHaveCount(1);
  await page.locator(".history-entry summary").click();
  await expect(
    page.getByText("7/10 acertos (70.0%)", { exact: false }),
  ).toBeVisible();
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(stored.history[0].status).toBe("Completa");
  expect(stored.history[0].active).toBe(2);
  expect(stored.history[0].duration).toBe(3);
});
test("JSON import validates, asks before replacing, and export round trips", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  const store = freshStore();
  store.routines[0].name = "Backup restaurado";
  const file = page.getByLabel("Arquivo de backup");
  await file.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("Backup inválido");
  await file.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(store)),
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).routines[0].name,
      KEY,
    ),
  ).toBe("Aquecimento rápido");
  await page.getByRole("button", { name: "Confirmar substituição" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup JSON" }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream!) content += chunk.toString();
  expect(JSON.parse(content).routines[0].name).toBe("Backup restaurado");
});
test("repetitions wait for confirmation and support partial session history", async ({
  page,
}) => {
  const store = freshStore();
  store.routines = [
    {
      ...defaults()[0],
      name: "Repetições",
      drills: [
        {
          ...makeDrill("pistol"),
          mode: "reps",
          seconds: 1,
          prep: 0,
          sets: 2,
          rest: 1,
        },
      ],
    },
  ];
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: KEY, value: store },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ver rotina Repetições", exact: true })
    .click();
  await page.getByRole("button", { name: "Ir para sessão" }).click();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.getByText("Confirme a série quando terminar")).toBeVisible({
    timeout: 4000,
  });
  await expect(
    page.getByRole("button", { name: "Confirmar série" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar série" }).click();
  await expect(page.getByText("Relaxe a mão. Respire.")).toBeVisible();
  await page.getByRole("button", { name: "Encerrar sessão" }).click();
  await page.getByRole("button", { name: "Salvar no histórico" }).click();
  await expect(page.locator(".history-entry")).toContainText("Parcial");
});
