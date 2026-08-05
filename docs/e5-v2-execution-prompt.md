# E5 v2 — Prompt de execução

> Copie o conteúdo abaixo integralmente para o modelo que vai implementar a
> E5 v2. Ele é autossuficiente: não depende de nenhuma conversa anterior.

---

Você vai implementar integralmente a **E5 v2 — Formulário de avaliação** do
projeto `gym-app` (Next.js 16 App Router, React 19, TypeScript strict,
Tailwind 4, Prisma 7 + SQLite, Zod 4, Base UI, Vitest).

## Contexto mínimo

- **Branch atual: `feat/evaluation-form-v2`.** Ela já existe, nasceu da `main`
  depois do merge de `refactor/evaluation-model` (documentação da mudança de
  domínio), e o working tree está limpo. **Trabalhe nela.** Não crie, não
  troque, não exclua branch.
- O domínio da avaliação mudou: o professor executa as tentativas **fora do
  sistema** e digita só o **melhor resultado final**. Não existem mais
  tentativas, repetições, ordem ou listas dinâmicas de teste. A avaliação tem
  **três blocos fixos**: Amplitude, Salto, Velocidade.
- **O backend ainda é v1.** `POST /api/avaliacoes` só aceita o contrato antigo
  (`testes[]`/`tentativas[]`, `ordem`, `repeticoes`). O backend autorizou o
  frontend a definir o contrato v2 desejado e vai revisar este trabalho antes
  de adaptar Prisma, schemas e `docs/api.md`.
- Existe uma implementação **v1** completa em `feat/evaluation-form`
  (`87e7336`), **nunca mergeada**. Ela é **referência histórica apenas** —
  muitos padrões dela (parser, rascunho, `useActionState`, mapeamento de erro)
  são reaproveitados; a estrutura de dados (lista dinâmica de testes e
  tentativas) **não é**.
- Esta etapa entrega o formulário **inteiro e funcional**, exceto a gravação
  real: a submissão bem-sucedida do lado do cliente termina numa porta de
  integração isolada que, hoje, devolve deterministicamente "backend v2
  indisponível" sem fazer nenhuma requisição HTTP.
- **A rota não tem entrada na ficha do aluno nesta etapa.**
  `/alunos/[id]/avaliacoes/nova` existe e é navegável por URL direta, mas
  `src/app/alunos/[id]/page.tsx` **não é tocado** — nenhum link, nenhum botão
  novo. A página em si abre com um **aviso persistente**, sempre visível,
  avisando que nada é salvo ainda. O botão de submit chama-se **"Validar
  preenchimento"**, nunca "Salvar avaliação", enquanto isso for verdade.

## Primeiro passo, obrigatório

Leia **integralmente**, antes de escrever qualquer linha de código:

1. `docs/e5-v2-implementation-spec.md` — **a especificação. É o plano.**
2. `docs/evaluation-model-v2-proposal.md` — o modelo de domínio, §1-§9 no
   mínimo.
3. `docs/frontend-plan.md` §0.5 — o que mudou e o que está congelado.
4. `docs/api.md` — para confirmar, por leitura, que o contrato vigente
   **ainda é v1** (você não vai integrar com ele, mas precisa saber o que ele
   diz para não confundir os dois).
5. `AGENTS.md` e `CLAUDE.md`.
6. `src/lib/medidas.ts` — as 4 medidas de amplitude + CMJ ainda vêm daqui
   (só a chave do DTO muda).
7. `src/features/alunos/acoes.ts`, `tipos.ts`, `mappers.ts` — padrão de
   `useActionState`, estado discriminado, mapeamento de 422.
8. `vitest.config.mts` e `src/lib/calculos.test.ts` — convenção de teste do
   projeto (Node, sem DOM; é o padrão que os novos `.test.ts` desta etapa
   seguem).

Depois **comece imediatamente**. Não crie um plano novo. Não me peça aprovação
de plano, de comando, de arquivo ou de commit.

## O que entregar

As cinco unidades de `docs/e5-v2-implementation-spec.md` §21, na ordem:

- **U1** — DTO, schema Zod, parser, mapper, porta de integração, testes
  unitários da lógica pura.
- **U2** — ação, rascunho v2, aviso persistente e casca da página (cabeçalho +
  faixa de "preenchimento validado"). **Nenhum link novo na ficha do aluno.**
- **U3** — fieldsets de Amplitude e Salto.
- **U4** — fieldset de Velocidade com a regra carga↔tempo.
- **U5** — acessibilidade, responsividade, casos de borda, commit final
  marcando a fronteira de integração pendente.

Tudo numa única sessão, sem parar entre unidades.

## Sequência exata de commits

Conventional Commits, mensagem **em inglês**, **sem** metadados de IA
(`Co-Authored-By`, `Claude-Session` ou equivalentes).

| # | Mensagem | Unidade |
| --- | --- | --- |
| 1 | `feat(avaliacoes): add v2 DTO, decimal parser and pure mappers` | U1 |
| 2 | `feat(avaliacoes): add v2 evaluation route with draft-aware form shell` | U2 |
| 3 | `feat(avaliacoes): add amplitude and salto fieldsets` | U3 |
| 4 | `feat(avaliacoes): add velocidade fieldset with load-time consistency rule` | U4 |
| 5 | `fix(avaliacoes): cover v2 form edge cases and mark backend integration as pending` | U5 |

> O commit de documentação (spec + este prompt) já existe. Comece pelo commit 1
> da tabela.

**O commit 5 é o commit final da sequência e precisa, no corpo da mensagem
(não só no título), declarar explicitamente a fronteira de integração
pendente** — o texto exato está em `docs/e5-v2-implementation-spec.md` §22.
Copie-o ou parafraseie mantendo os três fatos: o backend ainda é v1, nenhuma
avaliação real é gravada por este trabalho, e `enviarAvaliacaoV2` é a única
função que muda quando isso deixar de ser verdade.

Rode `npm run typecheck`, `npm run lint` e `npm test` antes de cada commit, e
`npm run build` em todas as unidades. Commite **apenas** arquivos do projeto.

## Autonomia — faça sem perguntar

Você pode, sem pedir autorização:

- executar qualquer comando não destrutivo;
- rodar `npm run dev`, `build`, `start`, `typecheck`, `lint`, `test`;
- subir e derrubar servidores locais;
- usar o navegador com DevTools para os itens manuais de §19.2 da spec;
- criar e excluir **um único aluno temporário** com prefixo
  `ZZTESTE-E5V2-`, usado apenas para exercitar a leitura da referência
  (`GET /alunos/:id`, `GET /avaliacoes?alunoId&limite=1`) — **nunca** para
  gravar uma avaliação, porque este formulário estruturalmente não grava
  nenhuma (spec §1.5, §13);
- fazer alterações temporárias e reversíveis no código para forçar um caso
  (inclusive `console.count` para medir re-render ou duplo submit), desde que
  **removidas antes do commit**;
- corrigir erros locais de `typecheck`, `lint`, `test` e `build`;
- escolher nomes locais, organização interna dos arquivos, classes Tailwind,
  espaçamentos e textos auxiliares que a spec não fixou (§24 da spec);
- fazer `git add` e `git commit`.

## Regra de dados — inviolável

- **Nunca** altere ou exclua **Ana Prado**, **Bruno Tavares** ou
  **Carla Menezes**, nem suas avaliações.
- **Não crie nenhuma avaliação, temporária ou não** — este formulário não deve
  chegar a chamar `POST /api/avaliacoes` em nenhum momento da implementação ou
  do teste. Se em algum ponto você perceber que `enviarAvaliacaoV2` está
  fazendo uma requisição real, **pare** — isso contradiz a spec (§13, §23
  item 2).
- Se criar o aluno `ZZTESTE-E5V2-*` para testar a referência, **registre o
  id** e **exclua-o** ao final da unidade em que foi usado.
- Ao encerrar, confirme por requisição real: `GET /api/alunos` → **exatamente
  3 alunos**, `totalAvaliacoes` **8 / 5 / 3**, todos `ativo: true`;
  `GET /api/avaliacoes?limite=200` → **16 itens**. Como nenhuma avaliação foi
  criada por este trabalho, estes números **não devem ter mudado em nenhum
  momento** — se mudarem, é sinal de que algo chamou a API real por engano.
- Limpe qualquer chave `gym-app:rascunho-avaliacao:v2:*` de teste do
  `localStorage` ao final.

> **Armadilha já observada em etapas anteriores.** Um `next dev` deixado
> rodando de sessões anteriores pode degradar e responder **500 em rotas
> válidas**. Se algo que deveria funcionar devolver 500, reinicie o dev server
> antes de concluir que há defeito de contrato.

## Proibições absolutas

- **Não** altere `prisma/**`, `src/app/api/**`, `src/lib/**`,
  `src/generated/**`, `prisma/seed.ts` ou `docs/api.md`.
- **Não** altere `package.json`, `package-lock.json`, `components.json`,
  `eslint.config.mjs`, `vitest.config.mts`, `.gitignore`,
  `docs/frontend-plan.md` ou `docs/evaluation-model-v2-proposal.md`.
- **Não** instale nenhuma dependência.
- **Não** execute `npm run db:seed`, `db:reset` ou `db:migrate`.
- **Não** use `git push`, `merge`, `rebase`, `reset --hard`, `clean -fd`,
  `stash drop` nem troque/exclua branch.
- **Não** converta a ação em Server Action.
- **Não** transforme o formulário em controlado.
- **Não** traga de volta lista dinâmica, seleção de teste, `ordem` ou
  `repeticoes` — o modelo v2 não tem nenhum dos quatro (spec §1, §16.2).
- **Não** invente unidade para os 4 campos de salto provisórios — nem no
  rótulo, nem no texto de apoio, nem em `placeholder` (B6 em aberto, spec
  §17.2, §17.3, §26). Rotule exatamente **"Resultado de salto 2"** a
  **"Resultado de salto 5"** — nunca "Salto 2".."Salto 5" (o nome curto
  soaria como um nome de exercício confirmado, que não é).
- **Não** nomeie o schema Zod do frontend de forma que pareça definitivo.
  O arquivo é `contrato-v2.ts`, o schema exportado é
  `schemaAvaliacaoV2Provisorio` — o sufixo "Provisorio" é obrigatório em
  todo lugar que o importa (spec §4.1). Ele será apagado quando o backend
  publicar o contrato real (spec §13.5) — não o trate como fonte de verdade
  permanente em nenhum comentário ou nome que você escrever.
- **Não** adicione o link "Nova avaliação" a `src/app/alunos/[id]/page.tsx`
  nesta etapa, sob nenhuma justificativa de conveniência de teste. O arquivo
  fica **intocado** (spec §1.6, §15.2, §23 item 13).
- **Não** rotule o botão de submit como "Salvar avaliação" nem o estado
  `pending` como "Salvando…" — os rótulos fixos são "Validar preenchimento" e
  "Validando…" (spec §17.1.2) enquanto `enviarAvaliacaoV2` não gravar de
  verdade.
- **Não** faça `enviarAvaliacaoV2` chamar `fetch` de verdade nesta etapa —
  isso só acontece quando o backend publicar o contrato v2 (spec §13.2, §23
  item 2). É a proibição mais importante desta lista: violá-la faria a UI
  mentir sobre ter salvado algo, ou faria a etapa poluir o banco com um
  payload que o backend v1 vai rejeitar ou, pior, aceitar parcialmente de
  forma corrompida.
- **Não** avance para a E6 nem para qualquer etapa seguinte.
- **Não** versione scripts, logs, screenshots ou arquivos temporários.

## Quando parar e me chamar

Pare, descreva o achado com evidência (`caminho:linha` ou saída de comando),
proponha alternativas e **aguarde decisão** apenas se encontrar algo da lista
de `docs/e5-v2-implementation-spec.md` §23. **Fora dessa lista, não pare.**
Decida e siga, usando a autonomia de §24 da spec.

## Qualidade exigida

- Comentários explicam **por quê**, nunca o quê. Só onde a razão não é óbvia.
- Sem código morto, sem `TODO`, sem `console.log` remanescente.
- Sem `any`. Sem `as` que mascare divergência de contrato.
- Nenhum dado pessoal em log.
- Português com acentuação correta em **todo texto de interface**.
- `npm test` cobre a lógica pura (parser, schema, mapper, porta de
  integração) — não é opcional, é parte dos critérios de aceite (spec §20,
  bloco "Automático").

## Cinco armadilhas já mapeadas — não redescubra

1. **React 19 sempre reseta o formulário.** A ação precisa ecoar todos os
   valores submetidos no estado (`ValoresAvaliacaoV2`), e todo `defaultValue`
   sai desse eco. Spec §11.
2. **`type="number"` perde dado com vírgula decimal.** Use `type="text"` +
   `inputMode="decimal"` nos 17 campos numéricos. Spec §6.
3. **A porta de integração é o único lugar autorizado a mudar quando o
   backend publicar o contrato.** Não espalhe lógica de rede em outro
   arquivo — isso quebraria a promessa central da spec (§13).
4. **Nem toda medida aceita zero.** `tempoSegundos` é `positive()` (zero
   proibido, divisão por zero); todo o resto do formulário é `min(0)` (zero é
   dado real). Spec §4.1.
5. **O aviso persistente e o rótulo do botão não são polimento — são a
   proteção contra a UI mentir.** Não os trate como texto qualquer que "a
   spec não fixou" (§24 da spec fixa os dois, literalmente). Escrever
   "Salvar avaliação" ou omitir o aviso, mesmo que "temporariamente para
   testar", é exatamente o comportamento que esta etapa foi corrigida para
   proibir.

## Entrega final

Ao terminar as 5 unidades, apresente um relatório com:

1. Resumo do que foi feito.
2. Funcionalidades entregues.
3. Arquivos criados e alterados (lista completa).
4. Commits, com hash, mensagem e responsabilidade.
5. Resultados de `typecheck`, `lint`, `test` e `build`.
6. Testes automatizados criados e o que cada um cobre (mapeando pra
   §19.1 da spec).
7. Testes manuais executados (§19.2 da spec) **e os não executados**, com
   resultado de cada um.
8. Critérios de aceite de §20 da spec, marcados um a um.
9. Confirmação explícita de que `enviarAvaliacaoV2` **nunca** chamou `fetch`
   durante toda a implementação e todo o teste.
10. Confirmação do seed 8/5/3 **inalterado** e de que nenhum
    `ZZTESTE-E5V2-*` restou no banco nem no `localStorage`.
11. As pendências de integração de §19.3 da spec, reafirmadas como não
    resolvidas — não é falha desta etapa, é o desenho dela.
12. Bloqueios reais restantes de §26 da spec.
13. Confirmação explícita de que `src/app/alunos/[id]/page.tsx` **não foi
    alterado**, de que o aviso persistente aparece antes de qualquer
    interação, e de que o botão está rotulado "Validar preenchimento" (nunca
    "Salvar avaliação") em todo estado do formulário.
14. Decisões tomadas dentro da sua autonomia.
15. `git status` final (deve estar limpo).

**Honestidade de relatório:** o que você não verificou deve ser declarado
como não verificado. Não afirme confirmação visual sem tê-la feito. Não afirme
que o formulário "salva a avaliação" — ele não salva, por desenho, e essa
distinção é o ponto central desta etapa.

Comece agora pela leitura de `docs/e5-v2-implementation-spec.md`.
