# E3 — Prompt de execução

> Documento de entrega. O conteúdo abaixo da linha é o prompt completo, pronto
> para ser copiado e colado para o modelo implementador. Ele é autossuficiente:
> não depende de nenhuma conversa anterior.

---

Você vai implementar **integralmente a etapa E3** do projeto `gym-app`, sozinho,
numa única sessão, sem me pedir aprovação para comandos, edições ou commits.

## Contexto mínimo

`gym-app` é um MVP de demonstração que substitui a planilha de Excel do CT E
Perform: acompanhamento de avaliações de performance (VBT).
Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
Prisma 7 · SQLite**.

O produto é o **relatório**. A rota `/avaliacoes/[id]/relatorio` já existe e está
completa em conteúdo (entregue na etapa E2). A E3 é a etapa de
**exportação e apresentação**: fazer esse relatório imprimir bem em A4 e virar um
PDF apresentável pelo diálogo nativo do navegador.

Branch atual: **`feat/report-export`**, criada a partir da `main` atualizada,
working tree limpo. Trabalhe nela.

## Primeiro passo, obrigatório

**Leia `docs/e3-implementation-spec.md` inteiro antes de escrever qualquer linha
de código.** Ele é a sua especificação: contém o estado atual medido, a decisão
arquitetural, as regras de CSS de impressão, as regras por componente, o plano de
5 unidades, os critérios de aceite e os casos de teste.

Depois leia, nesta ordem de autoridade:

1. `docs/api.md` — contrato da API, manda em tudo que é entrada e saída.
2. `docs/frontend-plan.md` — especialmente §2.1–2.3 (Server/Client),
   §4.10 (estilos), §8.3–8.5 (decisão do relatório).
3. `AGENTS.md` / `CLAUDE.md` na raiz.
4. Os arquivos que você vai tocar.

**`AGENTS.md` avisa que este Next.js tem breaking changes em relação ao que você
provavelmente conhece.** Antes de escrever código que dependa de API do
framework (`generateMetadata`, `params`, fronteira Server/Client), leia o guia
correspondente em `node_modules/next/dist/docs/`. Dois pontos já conhecidos:
`params` é uma `Promise` (sempre `await`), e `error.tsx` é obrigatoriamente
Client Component.

**Não crie um plano novo.** A spec já é o plano. Execute-a.

## O que entregar

As 5 unidades descritas em §14 da spec, na ordem, cada uma com seu commit:

| # | Unidade |
| --- | --- |
| U1 | Ação de impressão e fronteira Client |
| U2 | Base de impressão: `@page`, contrato de cor e caixa |
| U3 | Quebras de página e tabelas |
| U4 | Cabeçalho, rodapé e título do documento |
| U5 | Casos de borda, acessibilidade e fechamento |

## Autonomia — faça sem perguntar

- Editar qualquer arquivo permitido pela spec (§9.1–9.3).
- Rodar comandos: `npm run dev`, `npm run build`, `npm start`,
  `npm run typecheck`, `npm run lint`, `git status/log/diff/show/add/commit`,
  `curl`, e qualquer outro comando **não destrutivo**.
- Subir e derrubar o servidor local quantas vezes precisar.
- Abrir o navegador, usar a pré-visualização de impressão, o DevTools
  (Rendering → emular `media: print` e `prefers-color-scheme`), e gerar PDFs e
  screenshots temporários para inspeção.
- Fazer alterações **temporárias e reversíveis** no código para testar casos que
  o seed não cobre (método obrigatório em §12.2 da spec).
- Corrigir erros locais de `typecheck`, `lint` e `build`.
- Criar commits, um por unidade, sem me consultar entre eles.
- Refazer uma unidade que não passou na sua própria validação.

Decisões que são **suas**, sem perguntar: nomes locais, organização dos arquivos,
seletores e organização do bloco `@media print`, valores exatos de margem,
padding, espaçamento e tipografia dentro dos alvos da spec, breakpoints,
refactors locais nos arquivos que você já está tocando, e a divisão exata dos
commits.

## Proibições absolutas

- **Nunca** `git push`, `git merge`, `git rebase`, `git reset --hard`,
  `git clean -fd`, troca de branch, exclusão de branch, ou qualquer comando
  destrutivo irreversível.
- **Nunca** alterar `prisma/**`, `src/app/api/**`, `src/lib/**`,
  `src/generated/**`.
- **Nunca** escrever no banco: nada de `npm run db:seed`, `db:reset`,
  `db:migrate`, nem `POST`/`PATCH`/`DELETE` na API. `prisma/dev.db` é intocável.
- **Nunca** instalar dependência nova. `package.json`, `package-lock.json`,
  `components.json` e `eslint.config.mjs` ficam intactos. Em particular:
  **nada de `@react-pdf/renderer`, `puppeteer`, `html2canvas`, `html2pdf`** ou
  qualquer biblioteca de geração de PDF — a estratégia é HTML + Print CSS +
  `window.print()`, já decidida e validada empiricamente.
- **Nunca** resolver os tokens de tema da Nova globalmente
  (`frontend-plan.md` §0.4). Estão fora de escopo permanente nesta etapa; a spec
  §6.3 mostra como a impressão funciona sem eles.
- **Nunca** transformar `page.tsx` em Client Component.
- **Nunca** adicionar gráficos. Saíram do escopo da E3 (spec §1.5).
- **Nunca** commitar PDFs, PNGs, logs ou scripts de inspeção. Não altere o
  `.gitignore` para isso — gere os artefatos fora da árvore do projeto ou apague
  antes de commitar.
- **Nunca** adicionar metadados de IA nas mensagens de commit
  (`Co-Authored-By`, `Claude-Session` ou equivalentes).
- **Nunca** avançar para a E4.

## Quando parar e me chamar

Só nestes casos. Ao parar: descreva o achado, apresente evidência
(caminho:linha ou saída de comando), proponha alternativas, e aguarde decisão.
**Não contorne por conta própria.**

1. Necessidade de alterar backend (`prisma/**`, `src/app/api/**`, `src/lib/**`).
2. Necessidade de dependência nova.
3. Mudança de arquitetura (Server/Client, consumo da API, estratégia de impressão).
4. Impossibilidade **comprovada** de cumprir um requisito de aceite com Print
   CSS — com a evidência do que você tentou.
5. Risco de perda ou corrupção de dados.
6. Necessidade de publicar remotamente (push, deploy, URL pública).
7. Conflito real de contrato: campo ausente ou formato divergente de `api.md`.
8. Comando destrutivo irreversível.
9. Necessidade de resolver globalmente os tokens da Nova.

## Qualidade exigida

- `npm run typecheck` e `npm run lint` limpos ao fim de **cada** unidade.
- `npm run build` conclui em **todas** as unidades.
- Commits pequenos e coesos, um por unidade, Conventional Commits, **mensagem em
  inglês** (padrão do repositório). Sugestões em §15 da spec — ajuste se o
  conteúdo real divergir.
- Antes de cada commit: reverta toda alteração temporária de teste e confirme com
  `git diff` que não sobrou nada.
- **Valide no navegador e no PDF, não só no código.** A spec §13 descreve o
  roteiro. Não afirme que a impressão está correta sem ter olhado o PDF página a
  página.
- Todo o checklist de §11 da spec verificado antes de considerar a etapa
  concluída.

## Alvo concreto, já medido

O estado atual foi investigado empiricamente. Para o relatório de referência —
Ana Prado, avaliação de **30/04/2026**
(`/avaliacoes/78683421-734c-4809-b714-891bc9ff7765/relatorio`) — hoje o PDF sai
com **4 páginas**, uma tabela partida, um cabeçalho de tabela órfão, o link de
navegação impresso e, em tema escuro, texto cinza-claro sobre papel branco.

Uma prova de conceito validada em memória levou esse mesmo relatório a
**3 páginas, sem nenhuma seção partida, sem cabeçalho órfão, com texto preto em
tema claro e escuro, e corpo de tabela em 10,5 pt**. Esse é o alvo. A spec §2.8
traz a calibragem completa — inclusive a conclusão de que **não se deve encolher
a fonte raiz**.

Os IDs úteis do seed:

| Aluno | Avaliação | Uso |
| --- | --- | --- |
| Ana Prado | `78683421-734c-4809-b714-891bc9ff7765` (30/04/2026) | relatório de referência, o mais longo |
| Ana Prado | `2b6ed38e-3255-4482-8d8b-dc16d7c0a4dc` (10/07/2025) | divergência V3 (histórico à frente da avaliação) |
| Carla Menezes | `fa736863-9369-451d-a8b1-faa9acaf092a` (30/04/2026) | relatório curto (histórico de 3 pontos) |

## Entrega final

Ao terminar as 5 unidades, apresente um relatório com:

1. Resumo do que foi feito.
2. Funcionalidades entregues.
3. Arquivos criados.
4. Arquivos alterados.
5. Commits, com hash, mensagem e responsabilidade.
6. Resultados de `typecheck`, `lint` e `build`.
7. Testes funcionais executados **e os não executados**.
8. Rodadas de casos de borda (§12.3 da spec) com o resultado de cada uma.
9. Número de páginas do PDF antes e depois, por relatório testado.
10. Decisões tomadas dentro da sua autonomia.
11. Divergências encontradas em relação à spec ou à API.
12. Pendências conhecidas.
13. Limitações visuais **não** validadas.
14. `git status` final.

**Honestidade de relatório:** o que você não verificou deve ser declarado como
não verificado. Não afirme confirmação visual sem tê-la feito.

Comece agora pela leitura de `docs/e3-implementation-spec.md`.
