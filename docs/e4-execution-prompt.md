# E4 — Prompt de execução

> Documento de entrega. O conteúdo abaixo da linha é o prompt completo, pronto
> para ser copiado e colado para o modelo implementador. Ele é autossuficiente:
> não depende de nenhuma conversa anterior.

---

Você vai implementar **integralmente a etapa E4** do projeto `gym-app`, sozinho,
numa única sessão, sem me pedir aprovação para comandos, arquivos ou commits.

## Contexto mínimo

`gym-app` é um MVP de demonstração que substitui a planilha de Excel do CT E
Perform: acompanhamento de avaliações de performance (VBT).
Stack: **Next.js 16 (App Router) · React 19.2 · TypeScript · Tailwind CSS 4 ·
Prisma 7 · SQLite · Zod 4 · Base UI**.

As etapas E0–E3 entregaram só telas de **leitura**: lista de alunos, ficha do
aluno e relatório imprimível. A **E4 é a primeira etapa de escrita**: criar,
editar, inativar e excluir aluno. Ela existe para provar o padrão de formulário
num caso simples (dois campos) antes da E5, que é o formulário de avaliação —
o artefato mais arriscado do sistema.

Branch de trabalho: a que já estiver aberta na sessão (deve ser
**`feat/student-crud`**, criada a partir da `main` atualizada, working tree
limpo). **Não crie, não troque e não apague branch.**

## Primeiro passo, obrigatório

**Leia `docs/e4-implementation-spec.md` inteiro antes de escrever qualquer linha
de código.** Ele é a sua especificação: traz os contratos reais da API medidos
por requisição (não lidos da documentação), o diagnóstico fechado do bug de foco,
todas as decisões de produto já tomadas, o plano de 5 unidades, os critérios de
aceite e os casos de borda.

Depois leia, nesta ordem de autoridade:

1. `docs/api.md` — contrato da API.
2. `docs/frontend-plan.md` — especialmente §2.1–2.3 (Server/Client), §4.7
   (erros), §5.5 (revalidação), §6 (formulários), §7 (tipagem).
3. `AGENTS.md` / `CLAUDE.md` na raiz.
4. Os arquivos que você vai tocar.

**`AGENTS.md` avisa que este Next.js tem breaking changes em relação ao que você
provavelmente conhece.** Antes de escrever código que dependa de API do
framework, leia o guia correspondente em `node_modules/next/dist/docs/`. Pontos
já conhecidos: `params` e `searchParams` são `Promise` (sempre `await`);
`error.tsx` é obrigatoriamente Client Component; `router.refresh()` continua
válido e é o caminho certo aqui (o `refresh()` de `next/cache` é só para Server
Actions, que esta etapa **não** usa).

**Não crie um plano novo.** A spec já é o plano. Execute-a.

## O que entregar

As 5 unidades de §20 da spec, na ordem:

| # | Unidade |
| --- | --- |
| U1 | Correção do foco, tipos e infraestrutura de ação |
| U2 | Formulário compartilhado e criação (`/alunos/novo`) |
| U3 | Edição (`/alunos/[id]/editar`) e estado ativo |
| U4 | Confirmação e exclusão |
| U5 | Bordas, duplicidade, acessibilidade e responsividade |

## Sequência exata de commits

Conventional Commits, **mensagem em inglês**, sem metadados de IA
(`Co-Authored-By`, `Claude-Session` ou equivalentes):

```
1  fix(ui): restore visible focus ring on button and input
2  feat(alunos): add form field, action state and mappers
3  feat(alunos): add student creation form and route
4  feat(alunos): add student edit route and active state toggle
5  feat(alunos): add delete confirmation with impact summary
6  fix(alunos): cover form edge cases and accessibility
```

Ajuste a mensagem se o conteúdo real da unidade divergir, mantendo o formato.
Commite **apenas** arquivos do projeto — nenhum script, log ou screenshot.

## Autonomia — faça sem perguntar

- Editar qualquer arquivo permitido pela spec (§13.1–13.3).
- Rodar comandos: `npm run dev`, `npm run build`, `npm start`,
  `npm run typecheck`, `npm run lint`, `git status/log/diff/show/add/commit`,
  `curl`, e qualquer outro comando **não destrutivo**.
- Subir e derrubar o servidor local quantas vezes precisar.
- Usar o navegador e o DevTools para conferir foco, teclado, diálogo,
  responsividade e zoom.
- **Criar, editar e excluir alunos temporários** pela interface e pela API, e
  criar avaliações temporárias para eles (necessário para testar a cascata).
- Fazer alterações **temporárias e reversíveis** no código para forçar um caso
  (422, 500, rede fora do ar), revertendo antes do commit.
- Corrigir erros locais de `typecheck`, `lint` e `build`.
- Criar commits, sem me consultar entre eles.
- Refazer uma unidade que não passou na sua própria validação.

Decisões que são **suas**: nomes locais, organização interna dos arquivos,
classes Tailwind e espaçamentos dentro das regras de §14, composição de
subcomponentes, textos auxiliares que a spec não fixou, refactors locais nos
arquivos que já está tocando, e a divisão exata dos commits.

**Textos que a spec fixou e você não deve reescrever:** a mensagem sobre remover
data de nascimento (§8.4), os textos da confirmação de exclusão (§10.2), a
mensagem de nome duplicado (§11.2) e os rótulos de inativar/reativar (§9).

## Regra de dados — inviolável

Esta etapa altera e exclui dados. O banco tem **3 alunos de seed que não podem
ser tocados**:

| Nome | `dataNascimento` | `ativo` | avaliações |
| --- | --- | --- | --- |
| Ana Prado | 1998-03-14 | true | 8 |
| Bruno Tavares | 2001-11-02 | true | 5 |
| Carla Menezes | 1995-07-21 | true | 3 |

- **Nunca** edite, inative ou exclua esses três, nem suas avaliações.
- Todo registro de teste usa o prefixo **`ZZTESTE-E4-`** no nome.
- **Registre os ids** que criar, conforme criar.
- **Exclua todos os temporários** ao final de cada unidade.
- Ao encerrar, confirme com `curl http://localhost:3000/api/alunos` que restam
  **exatamente 3 alunos**, com **8 / 5 / 3** avaliações, todos ativos.

## Proibições absolutas

- **Nunca** `git push`, `git merge`, `git rebase`, `git reset --hard`,
  `git stash drop/clear`, `git clean -fd`, troca de branch, exclusão de branch,
  ou qualquer comando destrutivo irreversível.
- **Nunca** `npm run db:reset`, `npm run db:seed` ou `npm run db:migrate`.
  `prisma/dev.db` é intocável fora das operações de API com dados temporários.
- **Nunca** alterar `prisma/**`, `src/app/api/**`, `src/lib/**`,
  `src/generated/**`.
- **Nunca** instalar dependência nova. `package.json`, `package-lock.json`,
  `components.json` e `eslint.config.mjs` ficam intactos. Em particular: **nada
  de React Hook Form, Formik, ou qualquer biblioteca de formulário, store global
  ou biblioteca de diálogo** — o Base UI já instalado (1.6.0) cobre o diálogo.
- **Nunca** rodar `npx shadcn add` para gravar arquivos: além de o `init` estar
  quebrado neste ambiente, o registro sobrescreveria `button.tsx` e apagaria o
  fallback de foco do projeto. Escreva os componentes à mão.
- **Nunca** transformar `page.tsx` em Client Component, nem converter as ações
  em Server Actions.
- **Nunca** resolver globalmente os tokens de tema da Nova
  (`frontend-plan.md` §0.4). Estão fora de escopo permanente.
- **Nunca** commitar scripts, PDFs, logs ou screenshots. Não altere o
  `.gitignore` para isso.
- **Nunca** avançar para a E5 (formulário de avaliação).

## Quando parar e me chamar

Só nestes casos. Ao parar: descreva o achado, apresente evidência
(caminho:linha ou saída de comando), proponha alternativas e aguarde decisão.
**Não contorne por conta própria.**

1. Necessidade de alterar backend (`prisma/**`, `src/app/api/**`, `src/lib/**`).
2. Necessidade de alterar o schema do Prisma.
3. Necessidade de dependência nova.
4. Contrato real incompatível com §4 da spec.
5. Impossibilidade comprovada de cumprir um critério de aceite de §19.
6. Mudança de arquitetura (Server/Client, consumo da API, Server Actions).
7. Risco de perda de dado real — qualquer coisa que toque os 3 alunos do seed.
8. Comando destrutivo irreversível.
9. Necessidade de push, merge ou rebase.
10. Necessidade de resolver globalmente os tokens da Nova.
11. Requisito de produto indispensável que a spec não decidiu.

## Qualidade exigida

- `npm run typecheck` e `npm run lint` limpos ao fim de **cada** unidade.
- `npm run build` conclui em **todas** as unidades; `/alunos/novo` e
  `/alunos/[id]/editar` devem aparecer como `ƒ` (dinâmicas).
- Antes de cada commit: reverta toda alteração temporária, limpe os dados
  temporários e confirme com `git diff` que não sobrou nada.
- **Teste no navegador, não só no código.** Foco, teclado, `Escape` no diálogo,
  retorno de foco, 360/768/1280 px e zoom 200 % só se verificam ali.
- Todo o checklist de §19 da spec verificado antes de considerar a etapa
  concluída.

## Três armadilhas já mapeadas — não redescubra

1. **`dataNascimento` não pode ser limpa.** Medido: `null` → 422, `""` → 422,
   campo ausente → 200 mas **mantém a data antiga**. A spec §8.4 define a guarda
   no cliente. Não invente outro caminho.
2. **Foco invisível em `button.tsx` e `input.tsx`.** Causa fechada: `outline-none`
   fixa `--tw-outline-style: none`, e `focus-visible:outline-2` lê essa mesma
   variável. Correção validada: acrescentar `focus-visible:outline-solid`. Uma
   classe em cada arquivo — nada além disso.
3. **O diálogo sairia transparente.** O registro usa `bg-popover`, e `--popover`
   não existe neste projeto. Use **`bg-background`** explícito no popup, que é um
   dos dois tokens que existem de verdade.

## Entrega final

Ao terminar as 5 unidades, apresente um relatório com:

1. Resumo do que foi feito.
2. Funcionalidades entregues.
3. Arquivos criados.
4. Arquivos alterados.
5. Commits, com hash, mensagem e responsabilidade.
6. Resultados de `typecheck`, `lint` e `build`.
7. Testes funcionais executados **e os não executados**.
8. Casos de borda de §17 da spec, com o resultado de cada um.
9. **Ids temporários criados e confirmação de limpeza.**
10. **Estado final do seed** (saída de `GET /api/alunos`).
11. Decisões tomadas dentro da sua autonomia.
12. Divergências encontradas em relação à spec ou à API.
13. Pendências conhecidas.
14. Limitações **não** validadas.
15. `git status` final.

**Honestidade de relatório:** o que você não verificou deve ser declarado como
não verificado. Não afirme confirmação visual sem tê-la feito.

Comece agora pela leitura de `docs/e4-implementation-spec.md`.
