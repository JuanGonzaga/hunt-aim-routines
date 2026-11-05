# Hunt / Aim — Caderno de Mira

Aplicação independente em português brasileiro para acompanhar treinos manuais no estande de tiro do **Hunt: Showdown**.

- **Site:** https://JuanGonzaga.github.io/hunt-aim-routines/
- **Código:** https://github.com/JuanGonzaga/hunt-aim-routines

Sem integração com o jogo, leitura da tela, detecção de acertos, automação de comandos ou materiais oficiais. Não exige conta, backend ou serviço pago.

## Como usar

1. Escolha o tempo disponível, objetivo, dificuldade, distância e tipo de arma.
2. Abra uma rotina, confira suas instruções e ajuste o equipamento para a sessão.
3. Informe se existe um alvo móvel adequado no estande. Caso contrário, as etapas que exigem alvo móvel serão substituídas por tracking com movimento do jogador, mantendo a duração. A interface explica que a alternativa treina outra habilidade e **não substitui antecipação**.
4. Abra a sessão e clique em **Iniciar**. A preparação faz parte do tempo total.
5. Siga as séries e pausas. No modo por repetições, confirme cada série manualmente. Em séries por tempo, as repetições indicadas são referências de volume e não uma cadência obrigatória de tiros.
6. Registre resultados no intervalo ou ao final. São totais por exercício, somando as séries. Acertos, tentativas e repetições são opcionais e informados manualmente.
7. Salve a sessão no histórico para consultar minutos ativos da semana, sessões concluídas e distribuição de tempo por habilidade.

Os oito modelos são sugestões editáveis, sem promessa de melhora garantida:

| Rotina                  | Tempo total |
| ----------------------- | ----------: |
| Aquecimento rápido      |       5 min |
| Aquecimento completo    |      10 min |
| Flick e microajustes    |      15 min |
| Tracking                |      15 min |
| Antecipação             |      10 min |
| Pistola                 |      10 min |
| Média e longa distância |      20 min |
| Completo de mira        |      30 min |

Preparação ocorre uma vez antes de cada exercício. Descansos ocorrem entre séries e entre exercícios, nunca após a última série da rotina. Tempo ativo é a soma das séries de execução. As dificuldades alteram distância, amplitude, lado, ordem, ritmo e repetições de referência, preservando a duração. Os parâmetros ficam visíveis na sequência expandida. Os aquecimentos usam uma série por exercício; os treinos dedicados usam duas.

Em rotinas por repetições, a duração é uma **estimativa**. O cronômetro chega a zero e aguarda confirmação, contabilizando o tempo adicional de execução. Não há contagem automática de tiros, repetições ou acertos. Precisão vem antes de velocidade. Respeite a recuperação da arma, principalmente ao usar pistolas.

## Rotinas próprias

Crie, edite, duplique, exclua e reordene exercícios. Configure séries, duração ou repetições, preparação, descanso, distância aproximada em metros, ponto inicial do flick, lados, amplitude, ordem e número de alvos.

Equipamento usa campos independentes: arma principal/pistola, munição, mira aberta/luneta, nome opcional e velocidade opcional. A velocidade é preenchida pelo usuário e nunca deduzida do tipo de munição. Não fornecemos valores universais de antecipação. As referências em metros devem ser verificadas pelo jogador.

Editar uma sugestão inicial salva a alteração naquela rotina. **Restaurar rotinas padrão** repõe os oito modelos, preservando rotinas criadas ou duplicadas e todo o histórico. Alterações de equipamento na janela de preparação valem para a sessão; use **Editar** para salvar na rotina.

## Temporizador e áudio

- O relógio usa prazos absolutos com `Date.now()`, reconciliando as fases ao retornar de uma aba em segundo plano. Pausas não contam como tempo treinado.
- Fechar/recarregar a página recupera a sessão, reconciliando o tempo transcorrido se ela estava rodando. A sessão recuperada sempre fica pausada e exige confirmação para retomar.
- Avisos distinguem preparação, execução e descanso/término. Volume e silêncio são configuráveis. O navegador precisa de um gesto do usuário para liberar áudio.
- Navegadores podem bloquear sons, suspender abas ou o próprio dispositivo. **Não há garantia de avisos sonoros enquanto o jogo estiver em foco ou o dispositivo suspenso.** Ao voltar, os horários corrigem o relógio; avisos antigos não são reproduzidos em sequência.
- Espaço pausa/retoma somente quando a página da sessão está em foco, fora de campos e botões. Tab navega entre controles; Enter ativa botões. Não há atalhos globais no jogo.
- Tela cheia depende do suporte do navegador. Navegar para outra seção pausa o treino.
- Pular uma etapa de execução marca a sessão como parcial, mesmo que chegue ao final da sequência. Encerrar antes de executar qualquer exercício registra uma sessão cancelada.

## Histórico e comparações

O histórico começa vazio. Não existem resultados simulados. A semana começa na segunda-feira no horário local do navegador. Minutos representam **tempo ativo**; cada registro também mostra tempo total acompanhado, que inclui preparação e intervalos.

Percentual de acerto só aparece com números inteiros válidos: tentativas maiores que zero, acertos entre zero e tentativas. Comparações usam o mesmo exercício, dificuldade, faixa de distância, referência em metros e equipamento (tipo, munição, mira, nome e velocidade). Mostram o percentual ponderado pelos totais anteriores, sem afirmar causalidade ou melhora comprovada. Condições não registradas, como ritmo e amplitude, podem variar. Resultados de distâncias sem referência em metros devem ser interpretados com cuidado.

## Persistência e backup

O `localStorage` usa a chave versionada `hunt-aim-routines:v1`. Salva rotinas, preferências, histórico e a sessão atual. Os dados ficam apenas naquele perfil de navegador e origem do site; **não há sincronização entre dispositivos**. O site local de desenvolvimento e o publicado têm armazenamentos separados.

Em **Preferências**, exporte JSON e importe em outro navegador. Importações validam versão, estrutura, exercícios conhecidos, intervalos numéricos, resultados e plano da sessão; arquivos têm limite de 10 MB. Uma confirmação informa quantas rotinas e sessões substituirão os dados existentes. Exporte antes de substituir. Textos são renderizados pelo React sem interpretar HTML.

Falhas de leitura e gravação exibem aviso. Dados ilegíveis não são sobrescritos automaticamente; é possível importar um backup ou confirmar a substituição em Preferências. Se a cota de armazenamento acabar, exporte os dados da memória. Limpar o navegador ou usar navegação privada pode apagar os registros. Um campo de resultado ainda inconsistente não substitui o último resultado válido salvo.

## Desenvolvimento local

Requer Node.js **24** e npm.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:5173. React, TypeScript e Vite, com somente React/React DOM como dependências de execução. Fontes do Google Fonts são opcionais; há fallback para fontes do sistema. Nenhuma imagem oficial é utilizada.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Para os testes reais de navegador em desktop e viewport de celular:

```sh
npx playwright install chromium
npm run test:e2e
```

Os testes verificam durações exatas dos oito modelos em três dificuldades, fases, pausa/retomada, reconciliação em segundo plano, recuperação pausada, séries manuais, persistência, importação/exportação e fluxo de sessão. Testes de navegador usam armazenamento isolado, com dados de teste identificados e nunca incluídos no histórico da aplicação publicada. A emulação de celular usa Chromium; não substitui teste físico no Safari ou em aparelhos reais.

Estrutura:

- `src/types.ts`: contratos de dados.
- `src/data.ts`: biblioteca e rotinas prontas.
- `src/core.ts`: duração, máquina de fases, persistência e validação.
- `src/App.tsx`, `Editor.tsx`, `SessionView.tsx`, `History.tsx`: interface e fluxos.
- `tests/`: testes de lógica e navegador.
- `.github/workflows/deploy.yml`: build e deploy automático.

## GitHub Pages

O workflow usa Node 24, `npm ci`, testes de lógica e build de produção. Em seguida, publica `dist` com os actions oficiais do GitHub Pages. Qualquer push na branch `main` dispara o deploy.

No GitHub, **Settings → Pages → Source → GitHub Actions**. O repositório precisa permitir Actions e publicação de Pages. Também é possível executar o workflow manualmente em **Actions → Publicar no GitHub Pages → Run workflow**.

O Vite usa `base: './'`, compatível com o subdiretório `/hunt-aim-routines/`. A navegação é por estado na própria página, sem rotas que produzam 404 ao recarregar. O site não usa service worker; o primeiro carregamento depende da internet, e fontes externas podem ser substituídas pelo fallback quando indisponíveis.

Para conferir uma publicação, aguarde os jobs `build` e `deploy` concluírem e visite o endereço do site. Tokens, credenciais, dependências instaladas, builds e resultados locais dos testes não pertencem ao repositório.
