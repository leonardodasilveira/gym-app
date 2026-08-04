# gym-app

Acompanhamento de avaliações de performance (VBT) para o CT E Perform, no lugar
da planilha de Excel usada hoje.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma 7 + SQLite**.

> **Status: MVP de demonstração.** O back está de pé (alunos, avaliações,
> relatório) para o front ser montado em cima e o resultado ser mostrado ao
> professor. Fórmulas e textos do relatório são provisórios — ver
> [`docs/api.md`](docs/api.md).

## Documentação

| Arquivo | O que é |
| --- | --- |
| [`docs/api.md`](docs/api.md) | **contrato da API** — comece por aqui pra mexer no front |
| [`docs/frontend-plan.md`](docs/frontend-plan.md) | **plano do front** — como a interface é construída; specs por etapa em `docs/e*.md` |
| [`docs/planilha-atual.md`](docs/planilha-atual.md) | como o professor trabalha hoje, e as dúvidas em aberto |
| [`docs/vbt.md`](docs/vbt.md) | o que é Velocity Based Training, base conceitual |

## Rodando

```bash
npm install
cp .env.example .env    # DATABASE_URL apontando pro SQLite local
npm run db:migrate      # cria prisma/dev.db e aplica as migrations
npm run db:seed         # 3 alunos com histórico fictício
npm run dev             # http://localhost:3000
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | sobe o app em modo desenvolvimento |
| `npm run build` / `npm start` | build e execução de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest, uma passada |
| `npm run test:watch` | Vitest em modo watch |
| `npm run db:migrate` | gera e aplica migration a partir do `schema.prisma` |
| `npm run db:reset` | apaga o banco e reaplica todas as migrations |
| `npm run db:seed` | popula alunos e avaliações fictícios |
| `npm run db:studio` | abre o Prisma Studio pra inspecionar o banco |

`prisma generate` roda sozinho no `postinstall`, e o client sai em
`src/generated/prisma` (fora do git).

## Estrutura

```
prisma/schema.prisma    modelo de dados: Aluno, Avaliacao, Medida, Teste, Tentativa
prisma/seed.ts          dados fictícios pra demo
src/lib/prisma.ts       instância do PrismaClient (singleton p/ o dev server)
src/lib/medidas.ts      catálogo de medidas: código, sigla (SLB ESQ), rótulo, lado
src/lib/schemas.ts      contrato de entrada (Zod) — tipos compartilhados com o front
src/lib/http.ts         helpers de resposta e tradução de erro
src/lib/avaliacoes.ts   conversão entre o DTO do front e as tabelas
src/lib/relatorio.ts    monta a resposta do relatório + tipo RelatorioResponse
src/lib/calculos.ts     ⚠️ curva, perfil e score — tudo provisório
src/lib/textos.ts       ⚠️ textos do relatório — lorem ipsum
src/lib/*.test.ts       testes (Vitest); rodam contra a curva real do cliente
src/lib/__fixtures__/   dados reais transcritos de docs/planilha-atual.md
src/app/api/            route handlers
src/app/                páginas (alunos, relatório) + loading/error/not-found
src/components/ui/      primitivos de interface (shadcn/ui sobre Base UI)
src/features/           telas por domínio: alunos, relatorio, shared
```

O banco é um arquivo (`prisma/dev.db`) e **não** vai pro git — cada pessoa gera o
seu localmente.

## Testes

Vitest sobre as funções puras de `src/lib/` — sem banco, sem servidor, roda em
menos de um segundo. Os fixtures em `src/lib/__fixtures__/` **não são dados
inventados**: são os 8 pontos reais `(carga, VMP)` da linha 1001 da planilha do
professor e os números que o relatório dele publica, transcritos de
[`docs/planilha-atual.md`](docs/planilha-atual.md).

Dois testes estão marcados com ⚠️ e **existem para falhar um dia**. Eles fixam a
distância entre o que `src/lib/calculos.ts` calcula hoje (fórmulas provisórias) e
o que o relatório do professor publica para a mesma avaliação:

| O que diverge | Nosso valor | Relatório do professor |
| --- | --- | --- |
| V0 | 1,687 m/s | 1,88 m/s |
| F0 | 144,5 kg | 122,1 kg |
| Perfil | "Equilibrado" | "Levemente orientado à velocidade" |

Hoje eles **passam**, justamente porque a divergência existe. Quando o `.xlsx`
chegar e as fórmulas reais entrarem, eles quebram — e essa quebra é o sinal de
que a distância fechou. Aí viram igualdade contra `RELATORIO_PUBLICADO`.

## Divisão do trabalho

Back (`prisma/`, `src/lib/`, `src/app/api/`) e front (páginas em `src/app/`,
`src/components/`, `src/features/`) ficam em pastas separadas pra reduzir
conflito de merge.
