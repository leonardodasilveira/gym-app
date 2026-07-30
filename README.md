# gym-app

MVP de gestão de treinos de academia.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma 7 + SQLite**.

> Status: scaffold. O modelo de dados e as telas ainda vão ser definidos.

## Rodando

```bash
npm install
cp .env.example .env    # DATABASE_URL apontando pro SQLite local
npm run dev             # http://localhost:3000
```

O banco só existe depois que houver models em `prisma/schema.prisma`:

```bash
npm run db:migrate      # cria prisma/dev.db e aplica a migration
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | sobe o app em modo desenvolvimento |
| `npm run build` / `npm start` | build e execução de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | gera e aplica migration a partir do `schema.prisma` |
| `npm run db:reset` | apaga o banco e reaplica todas as migrations |
| `npm run db:studio` | abre o Prisma Studio pra inspecionar o banco |

`prisma generate` roda sozinho no `postinstall`, e o client sai em
`src/generated/prisma` (fora do git).

## Estrutura

```
prisma/schema.prisma    modelo de dados (vazio por enquanto)
prisma.config.ts        config do Prisma CLI
src/lib/prisma.ts       instância do PrismaClient (singleton p/ o dev server)
src/app/                rotas do App Router — páginas e, futuramente, /api
```

O banco é um arquivo (`prisma/dev.db`) e **não** vai pro git — cada pessoa gera o
seu localmente.

## Divisão do trabalho

Back (`prisma/`, `src/lib/`, `src/app/api/`) e front (páginas em `src/app/`,
`src/components/`) ficam em pastas separadas pra reduzir conflito de merge.
