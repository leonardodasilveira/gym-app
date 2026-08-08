# E6 — Detalhe da avaliação · especificação de implementação

> **Status:** aprovada, pronta para execução. Escrita em 08/08/2026 sobre o
> código real da branch `feat/evaluation-detail` (nivelada com `main`, que já
> contém a E5 v2 integrada — PR #20, `799dd99`).
>
> **Autossuficiente por desenho.** Um agente sem o contexto da conversa que
> originou esta spec deve conseguir executar a E6 inteira lendo só este arquivo
> mais os arquivos que ele cita. Toda afirmação sobre o estado atual aponta para
> arquivo e linha.

---

## 1. Objetivo

Entregar a rota `/avaliacoes/[id]`: a tela que mostra uma avaliação individual
já gravada, com os três blocos do modelo v2, e que permite excluí-la.

O critério que dá sentido à etapa é o **round-trip visual**: o que o professor
digitou no formulário da E5 aparece idêntico aqui. Se um número muda, some, ou
um campo vazio vira `0`, a etapa falhou — independentemente de a tela estar
bonita.

## 2. Não objetivos

Nenhum destes entra na E6. Não implementar, não preparar terreno, não deixar
"quase pronto":

- **Edição de avaliação e `PATCH /avaliacoes/:id`.** Decisão explícita do
  produto (08/08/2026). Não transformar `AvaliacaoFormV2` em formulário de
  edição, não criar modo `criar`/`editar`, **não adicionar botão "Editar"**. O
  endpoint existe e está em formato v2 (`src/app/api/avaliacoes/[id]/route.ts:51`),
  mas consumi-lo é trabalho futuro separado — ver §26.
- E7 inteira: seletor de período, compartilhamento (WhatsApp/e-mail), PDF novo.
- Redesenho do relatório existente.
- Correção do bug de unidade do relatório (§25, D1) — **registrar, não corrigir**.
- Refatoração geral de `src/features/alunos/**` (§25, D2).
- Polish global da E8.
- Qualquer mudança em Prisma, migrations, seed ou contrato do backend.
- Instalação de dependências.

## 3. Estado inicial confirmado

| Fato | Evidência |
|---|---|
| `/avaliacoes/[id]/page.tsx` **não existe** | `src/app/avaliacoes/[id]/` contém somente `relatorio/` |
| Relatório existe e funciona | `src/app/avaliacoes/[id]/relatorio/page.tsx` |
| Nenhum código de front busca avaliação única | grep `api/avaliacoes` em `src/features`+`src/app`: só lista (`?alunoId=`) e relatório |
| `excluirAvaliacao` não existe | grep: nenhuma ocorrência em `src/` |
| E5 v2 presente | `6b713ed`, `3fb4bdd`, `4fbffab`, `82a2b1a`, `137dc92` ancestrais de HEAD |
| Gates verdes no ponto de partida | 94 testes, typecheck ok, lint limpo, `git diff --check` limpo |
| Next.js | `16.2.12` (`node_modules/next/package.json`) |
| `staleTimes` **não** configurado | `next.config.ts` sem `experimental.staleTimes` |

## 4. Fontes de verdade

| Assunto | Autoridade |
|---|---|
| Contrato da API | `docs/api.md`; onde ele for omisso, o código do route handler |
| Arquitetura e roadmap do front | `docs/frontend-plan.md` |
| Catálogo de medidas e exercícios | `src/lib/medidas.ts` (import estático — decisão D6, `api.md`) |
| Padrões da E5 | `docs/e5-v2-implementation-spec.md` — **registro histórico**; não ressuscitar estados provisórios já removidos (`pendente-integracao`, `contrato-v2.ts`, `AvisoFormularioProvisorio`) |
| Modelo de domínio v2 | `docs/evaluation-model-v2-proposal.md` — histórico/proposta; **`api.md` vence** em divergência |

## 5. Contrato utilizado

### 5.1 `GET /api/avaliacoes/:id`

Handler: `src/app/api/avaliacoes/[id]/route.ts:17-31`. Devolve
`serializarAvaliacao(avaliacao)` (`src/lib/avaliacoes.ts:254-265`) acrescido de
`alunoNome`:

```ts
{
  id: string;
  alunoId: string;              // ← presente. É como a E6 volta para a ficha.
  dataAvaliacao: string;        // "AAAA-MM-DD"
  amplitude: { tornozelo: {direito: number|null, esquerdo: number|null},
               quadril: {...}, isquiotibiais: {...}, slb: {...} };
  saltos: { cmj: number|null, salto2: number|null, salto3: number|null,
            salto4: number|null, salto5: number|null };
  velocidade: { squatJump:   { cargaKg: number|null, tempoSegundos: number|null },
                agachamento: { cargaKg: number|null, tempoSegundos: number|null } };
  observacoes: string | null;
  criadoEm: string;             // ISO completo
  alunoNome: string;
}
```

**Nenhuma unidade trafega no payload.** Unidade é propriedade do catálogo.

**404 cobre os dois casos.** A rota não valida UUID: `findUnique` devolve `null`
tanto para id malformado quanto inexistente, e o handler lança
`naoEncontrado("Avaliacao nao encontrada")`. **Não existe 422 nesta rota.**

### 5.2 `DELETE /api/avaliacoes/:id`

Handler: `src/app/api/avaliacoes/[id]/route.ts:113-119`.

```ts
await prisma.avaliacao.delete({ where: { id } });
return new Response(null, { status: 204 });
```

- Sucesso: **`204` sem corpo**. `apiFetch` já trata (`src/features/shared/api.ts:31`).
- Inexistente: sem checagem prévia → Prisma `P2025` → **`404`**
  (`src/lib/http.ts:70-71`).
- Falha de rede: `apiFetch` devolve `status: 0` (`api.ts:27`).
- A exclusão **cascateia** para `Medida` e `MedidaVelocidade`
  (`prisma/schema.prisma:60,88`). O texto da confirmação deve dizer isso.

### 5.3 Divergência documental registrada

`docs/api.md` documenta `GET /avaliacoes/:id` e `DELETE /avaliacoes/:id` apenas
na tabela de rotas (linhas 169–173), com descrição de uma linha, **sem seção
`###` dedicada** — ao contrário de `POST` e `PATCH`. O tipo de retorno está
especificado (linhas 176–194) e **confere com o código**. Não é contradição, é
lacuna de detalhamento: os códigos de status do `DELETE` saem do código, única
evidência disponível. **Não alterar `api.md` nesta etapa** (§24).

### 5.4 Catálogo — sem fetch

`GET /api/medidas` existe (`src/app/api/medidas/route.ts`) mas **a E6 não o
chama**. O catálogo é importado estaticamente de `@/lib/medidas`, decisão D6 já
registrada em `api.md` ("o front pode importar `MEDIDAS`: sim") e já praticada
em `src/features/alunos/utils.ts:1-7`.

Isso é o que garante o requisito "a UI não mantém segunda fonte de verdade de
unidades": existe **uma** definição de unidade, em `src/lib/medidas.ts`.

## 6. Arquitetura

### 6.1 Server/Client

A página é **Server Component**. A única ilha Client é a exclusão.

```
app/avaliacoes/[id]/page.tsx              Server — carrega e renderiza tudo
  ├── (blocos: Amplitude, Salto, Velocidade, Observações)   Server
  └── AcoesAvaliacao.tsx                  Client — "use client": botão + dialog
```

Justificativa concreta, não hipótese: `src/features/alunos/AcoesAluno.tsx` já é
exatamente este padrão na ficha do aluno — página Server, ilha Client só para a
mutação. A E6 replica. **A página não vira Client Component para conseguir
excluir.**

O que força `AcoesAvaliacao` a ser Client: `useState` (dialog aberto, pendente,
erro), `useRouter` (navegação pós-exclusão) e `ConfirmDialog`, que é
`"use client"` (`src/components/ui/confirm-dialog.tsx:1`).

### 6.2 Reuso — o que já existe e será consumido

Nada disto precisa ser escrito de novo:

| Peça | Local | Papel na E6 |
|---|---|---|
| `colunasDeMedida()` | `features/alunos/utils.ts:86` | 13 colunas derivadas de `MEDIDAS`, com `bloco` discriminante |
| `valorDaColuna()` | `features/alunos/utils.ts:136` | lê `amplitude[chave][lado]` ou `saltos[chave]` |
| `RotuloColuna` | `features/alunos/RotuloColuna.tsx:17` | omite parênteses quando `unidade === null` |
| `NotaUnidadeProvisoria` | `features/alunos/RotuloColuna.tsx:36` | nota única sobre unidade não confirmada |
| `ValorOuAusente` | `components/ui/valor-ausente.tsx:11` | "—" visual + `sr-only "não medido"` |
| `formatarNumeroOuTraco` | `features/shared/formato.ts:26` | `null`→"—", **`0`→"0"** |
| `formatarData` | `features/shared/formato.ts:5` | "AAAA-MM-DD" → "DD/MM/AAAA", sem `new Date` |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | confirmação modal, foco inicial em Cancelar |
| `apiFetch` | `features/shared/api.ts:18` | único ponto de HTTP; trata 204 e rede |
| `mensagemDoErro` | `features/shared/erros.ts:5` | status → texto pt-BR; nunca exibir `error` cru |
| `Table`, `Card`, `Badge`, `Skeleton`, `ErrorState`, `EmptyState` | `components/ui/` | — |
| `cache()` no loader | padrão em `features/relatorio/dados.ts:13` | dedupe `generateMetadata` ↔ página |

### 6.3 Tipo da avaliação

Reusar `AvaliacaoCompleta` de `@/features/alunos/tipos` (linha 35):

```ts
export type AvaliacaoCompleta = ReturnType<typeof serializarAvaliacao> & {
  alunoNome: string;
};
```

É **exatamente** o shape de `GET /avaliacoes/:id` (§5.1). Reusá-lo dá
`valorDaColuna()` de graça, sem adaptação nem cast. Não criar tipo novo. O
débito de localização está registrado em §25 (D2).

## 7. Árvore final prevista

```
src/
├── app/
│   └── avaliacoes/[id]/
│       ├── page.tsx              ← NOVO   Server Component + generateMetadata
│       ├── loading.tsx           ← NOVO   Skeleton
│       ├── error.tsx             ← NOVO   "use client" + ErrorState
│       ├── not-found.tsx         ← NOVO
│       └── relatorio/            (intocado)
└── features/
    ├── avaliacoes/
    │   ├── dados.ts                        ← NOVO   loader com cache()
    │   ├── detalhe.ts                      ← NOVO   lógica pura (testável)
    │   ├── detalhe.test.ts                 ← NOVO
    │   ├── AcoesAvaliacao.tsx              ← NOVO   "use client" — exclusão
    │   ├── BlocoMedidas.tsx                ← NOVO   Amplitude e Salto
    │   ├── VelocidadeTabelaAvaliacao.tsx   ← NOVO   tabela compartilhada (§13)
    │   ├── acoes.ts                        ← ALTERADO (+ excluirAvaliacao)
    │   ├── acoes.test.ts                   ← ALTERADO (+ testes de exclusão)
    │   └── (demais arquivos da E5: INTOCADOS)
    └── alunos/
        ├── VelocidadeAvaliacao.tsx         ← ALTERADO (passa a consumir §13)
        └── HistoricoAvaliacoes.tsx         ← ALTERADO (destino do link, §14)
```

## 8. Responsabilidades por arquivo

**`features/avaliacoes/dados.ts`** — server-only. Exporta
`carregarAvaliacao = cache(async (id) => ...)`, que chama
`apiFetch<AvaliacaoCompleta>(\`${origem}/api/avaliacoes/${encodeURIComponent(id)}\`)`.
Espelha `features/relatorio/dados.ts` linha a linha, inclusive o comentário
sobre `cache()` e sobre nunca importar em Client Component (usa `origemAtual()`,
que lê `headers()`).

**`features/avaliacoes/detalhe.ts`** — **puro, sem JSX, sem import de React**.
É onde mora a lógica que os testes conseguem alcançar (§21). Exporta:

```ts
export type LinhaMedidaDetalhe = {
  chave: string;
  lado: "direito" | "esquerdo" | null;
  rotulo: string;        // sigla, ex.: "TOR DIR"
  nomeCompleto: string;  // ex.: "Mobilidade de tornozelo (direito)"
  unidade: string | null;
  valor: number | null;
};

/** Linhas de um bloco, na ordem do catálogo. Toda chave sempre presente. */
export function linhasDoBloco(
  avaliacao: AvaliacaoCompleta,
  bloco: "amplitude" | "salto",
): LinhaMedidaDetalhe[];
```

Implementação: `colunasDeMedida().filter(c => c.bloco === bloco)` e, para cada
coluna, `valorDaColuna(avaliacao, coluna)`. **Não reimplementar a derivação do
catálogo** — reusar as funções existentes.

**`features/avaliacoes/BlocoMedidas.tsx`** — Server. Recebe
`{ titulo, linhas }` e renderiza `<section aria-labelledby>` + `<h2>` + `Table`
de duas colunas (Medida | Valor) + `NotaUnidadeProvisoria`. Usa `RotuloColuna`
para o rótulo e `ValorOuAusente` para o valor. Serve tanto para Amplitude
quanto para Salto — **um componente, dois usos**, não dois componentes iguais.

**`features/avaliacoes/VelocidadeTabelaAvaliacao.tsx`** — Server. Só a tabela
(§13).

**`features/avaliacoes/AcoesAvaliacao.tsx`** — `"use client"`. Botão "Excluir
avaliação", `ConfirmDialog`, estados `dialogAberto`/`excluindo`/`erroExclusao`,
e a navegação pós-exclusão (§17).

**`features/avaliacoes/acoes.ts`** — acrescentar `excluirAvaliacao(id)` ao lado
de `criarAvaliacaoV2`, espelhando `features/alunos/acoes.ts:128`:

```ts
export async function excluirAvaliacao(id: string): Promise<ResultadoApi<undefined>> {
  return apiFetch(`/api/avaliacoes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
```

**`app/avaliacoes/[id]/page.tsx`** — Server. `generateMetadata` + página, ambos
chamando `carregarAvaliacao(id)` (deduplicado por `cache()`).

## 9. Fluxo de carregamento

```
/avaliacoes/[id]
   ↓ generateMetadata → carregarAvaliacao(id)   ─┐ mesma chamada,
   ↓ página            → carregarAvaliacao(id)  ─┘ deduplicada por cache()
   ↓ resultado.ok === false && status === 404  → notFound()
   ↓ resultado.ok === false (outros status)    → throw new Error(mensagem)
   ↓ resultado.ok === true                     → renderiza
```

`generateMetadata` devolve `{ title: "Avaliação — {alunoNome} — {data}" }` no
caminho feliz e `{ title: "Avaliação" }` quando `!resultado.ok` — mesmo padrão
de `app/avaliacoes/[id]/relatorio/page.tsx:21-37`, **sem** chamar `notFound()`
dentro de `generateMetadata`.

## 10. 404 e error

**`not-found.tsx`** — copiar a estrutura de
`app/avaliacoes/[id]/relatorio/not-found.tsx`, ajustando o texto:

> **Avaliação não encontrada** · "A avaliação que você está procurando não
> existe ou foi removida." · link "Voltar para a lista de alunos" → `/alunos`

O link vai para `/alunos` e não para a ficha porque, num 404, **não temos
`alunoId`** — a resposta que o traria é justamente a que falhou. Mesma decisão
já tomada em `relatorio/not-found.tsx:13`.

**`error.tsx`** — `"use client"`, `ErrorState` com
`titulo="Não foi possível carregar esta avaliação"`, `mensagem={error.message}`,
`aoTentarNovamente={reset}`. Cópia estrutural de
`app/avaliacoes/[id]/relatorio/error.tsx`.

**`loading.tsx`** — `Skeleton`s no mesmo esqueleto visual da página (cabeçalho,
três blocos, ações), seguindo `app/avaliacoes/[id]/relatorio/loading.tsx`.

> Consequência arquitetural de existir `loading.tsx`: a rota é dinâmica e o
> Client Cache do segmento fica **desligado por padrão** — isso importa em §17.

## 11. Transformação dos três blocos

| Bloco | Origem | Linhas | Componente |
|---|---|---|---|
| **Amplitude** | `linhasDoBloco(avaliacao, "amplitude")` | 8 (4 medidas × 2 lados) | `BlocoMedidas` |
| **Salto** | `linhasDoBloco(avaliacao, "salto")` | 5 (CMJ + salto2..5) | `BlocoMedidas` |
| **Velocidade** | `avaliacao.velocidade` + `EXERCICIOS_VELOCIDADE` | 2 exercícios × (carga, tempo) | `VelocidadeTabelaAvaliacao` |

**Toda chave sempre aparece**, mesmo não medida. Ocultar linha vazia faria a
tabela mudar de tamanho conforme o preenchimento e esconderia do professor a
informação "isto não foi medido" — que é informação. Regra já seguida em
`features/alunos/VelocidadeAvaliacao.tsx:22-24` e no relatório.

**Observações**: quando `observacoes` for `null` ou string vazia após `trim()`,
renderizar `EmptyState` com título "Nenhuma observação registrada" — não deixar
a seção sumir nem imprimir "null".

## 12. `null` versus zero, e unidades

**A regra mais sensível da etapa.** `null` = não medido; `0` = medido e deu
zero. A UI **nunca** pode transformar um no outro.

- `formatarNumeroOuTraco(null)` → `"—"`; `formatarNumeroOuTraco(0)` → `"0"`.
  Já correto (`features/shared/formato.ts:26`), com cobertura em
  `features/alunos/utils.test.ts`.
- Envolver sempre em `ValorOuAusente`, que acrescenta `sr-only "não medido"` e
  esconde o traço de tecnologia assistiva — um leitor de tela anunciando só
  "traço" não informa nada.
- **Proibido** `valor || "—"`, `valor ?? 0`, `Number(valor)` ou qualquer
  expressão em que `0` caia no ramo do ausente.

**Unidades** — sempre do catálogo, nunca da UI:

- `RotuloColuna` imprime `(cm)` quando há unidade e **omite os parênteses
  inteiros** quando `unidade === null` (`RotuloColuna.tsx:23-25`). Nunca `()`.
- `NotaUnidadeProvisoria` explica uma vez, abaixo da tabela, quais colunas estão
  sem unidade confirmada. Some sozinha no dia em que B6 for respondido.
- Os quatro saltos provisórios têm `unidade: null` no catálogo
  (`src/lib/medidas.ts:108,117,126,135`). **A E6 não inventa `cm`, `%`, `m/s`
  nem qualquer sufixo para eles** — e faz isso corretamente independentemente do
  bug existente no relatório (§25, D1).
- Velocidade: `kg` e `s` são fixas pelo domínio e vivem no cabeçalho da coluna
  ("Carga (kg)", "Tempo (s)"), como já fazem `VelocidadeAvaliacao.tsx:47-53` e
  o relatório. Não vêm do payload.

## 13. Componente compartilhado de velocidade

Extração aprovada. Escopo **estritamente** a representação da tabela
`Exercício | Carga (kg) | Tempo (s)`. Não generalizar além disso.

| | |
|---|---|
| **Arquivo atual** | `src/features/alunos/VelocidadeAvaliacao.tsx` |
| **Arquivo novo** | `src/features/avaliacoes/VelocidadeTabelaAvaliacao.tsx` |
| **Responsabilidade movida** | O `<Table>` completo: cabeçalho de 3 colunas, `TableCaption` sr-only, iteração sobre `EXERCICIOS_VELOCIDADE`, leitura de `avaliacao.velocidade[chave]`, `ValorOuAusente` em carga e tempo (hoje `VelocidadeAvaliacao.tsx:41-81`) |
| **Responsabilidade que permanece em `VelocidadeAvaliacao`** | O contexto próprio da ficha do aluno: `<section aria-labelledby="velocidade-heading">`, o `<h2>` "Velocidade da avaliação **mais recente**", o subtítulo com `formatarData(avaliacao.dataAvaliacao)`, e o `className="mt-8"` (linhas 32-39) |
| **Props do novo componente** | `{ velocidade: AvaliacaoCompleta["velocidade"] }` — recebe só o bloco, não a avaliação inteira. Assim não depende de `dataAvaliacao` nem de `alunoNome`, que são contexto do chamador |
| **Consumidores depois da mudança** | (1) `features/alunos/VelocidadeAvaliacao.tsx` — ficha do aluno; (2) o bloco Velocidade de `app/avaliacoes/[id]/page.tsx` — E6 |

A E6 fornece seu próprio wrapper: `<section>` + `<h2>` "Velocidade", **sem** o
"mais recente" e sem repetir a data (que já está no cabeçalho da página).

**Esta extração não autoriza reorganizar `features/alunos`** (§25, D2).

## 14. Navegação da ficha → detalhe

Alterar **um** link em `src/features/alunos/HistoricoAvaliacoes.tsx:67`:

```diff
- href={`/avaliacoes/${avaliacao.id}/relatorio`}
+ href={`/avaliacoes/${avaliacao.id}`}
```

Nada mais muda no arquivo: classes de foco, `TableHead scope="row"` e o texto
da data permanecem. **Não acrescentar coluna "Detalhes"** para preservar o link
antigo — o relatório passa a ser alcançado a partir do detalhe.

Fluxo pretendido: **Ficha do aluno → Detalhe da avaliação → Relatório.**

## 15. Atalho para o relatório

Na página de detalhe, ação explícita **"Ver relatório"** apontando para
`/avaliacoes/${id}/relatorio`. Um `<Link>` com `buttonVariants({ variant: "outline" })`
e `h-11 sm:h-9`, no mesmo padrão do "Editar aluno" da ficha
(`features/alunos/AcoesAluno.tsx:87-92`).

Posição: no topo, ao lado do link "← Ficha do aluno", espelhando a barra do
relatório (`relatorio/page.tsx:63-71`). É atalho de navegação, não ação
destrutiva — não fica junto de "Excluir".

Nenhuma funcionalidade de E7 acompanha isso: só o link.

## 16. Cabeçalho da página

```
← Ficha do aluno                                        [Ver relatório]

Avaliação de 08/08/2026          ← <h1>
Ana Prado                        ← nome do aluno, linka para /alunos/{alunoId}
Registrada em 08/08/2026         ← criadoEm, texto secundário
```

- `<h1>` = "Avaliação de {formatarData(dataAvaliacao)}" — a data é o que
  identifica a avaliação para o professor.
- `alunoNome` vem da resposta (§5.1); linkar para `/alunos/${alunoId}` dá um
  segundo caminho de volta.
- `criadoEm` é ISO completo; formatar só a data.
  **Não usar `formatarData`** nele — aquela função espera `"AAAA-MM-DD"` e
  faz `split("-")` (`formato.ts:5-8`); `criadoEm` é
  `"2026-08-08T10:51:48.500Z"`. Usar `criadoEm.slice(0, 10)` antes de formatar,
  ou omitir o campo. Registrar a escolha no código.

## 17. DELETE — decisão de navegação validada

### 17.1 A pergunta

O padrão existente no repositório é `router.refresh()` seguido de `router.push()`
(`features/alunos/AcoesAluno.tsx:76-77`, `features/alunos/AlunoForm.tsx:93-94`).
A instrução foi **não copiar isso por hábito** e usar o mínimo necessário para
garantir: `DELETE 204/404` → navegar para `/alunos/[alunoId]` → ficha renderizada
sem a avaliação removida.

### 17.2 Evidência (docs do Next 16.2.12 instalado)

- `node_modules/next/dist/docs/01-app/04-glossary.md:43` — Client Cache:
  **"Pages are not cached by default** but are reused during browser
  back/forward navigation."
- `.../02-guides/prefetching.md:29` — para **página dinâmica**: "Client Cache
  TTL: **Off**, unless enabled"; "Server roundtrip on click: **Yes**".
- `.../02-guides/prefetching.md:55` — "With `loading.js` | Layout to first
  loading boundary | **Off by default**".
- `.../05-config/01-next-config-js/staleTimes.md:7` — `staleTimes` é
  **experimental** e serve para **habilitar** cache de segmentos de página.
  Este projeto **não o configura** (`next.config.ts` vazio).
- `.../04-functions/use-router.md:47` — `router.refresh()`: "Refresh **the
  current route**."

`/alunos/[id]` é rota dinâmica (usa `headers()` via `origemAtual()`; aparece
como `ƒ` no `next build`) e **tem `loading.tsx`**. Logo, seu segmento de página
não fica no Client Cache, e navegar até ela dispara roundtrip ao servidor, que
re-executa o Server Component e refaz o `GET /api/avaliacoes?alunoId=...`.

Além disso, `router.refresh()` atualiza *a rota atual* — que aqui é
`/avaliacoes/[id]`, a página que está sendo abandonada porque o recurso dela
acabou de ser excluído. Ele não faz nada pela rota de destino.

### 17.3 Decisão

```ts
router.replace(`/alunos/${alunoId}`);
```

**Sem `router.refresh()`.** Justificativa: (a) o destino é dinâmico e sem cache
de segmento, então o `push`/`replace` já produz leitura atualizada — um
`refresh()` seria redundante e ainda por cima aplicado à rota errada; (b)
`replace` em vez de `push` porque a entrada de histórico atual aponta para uma
avaliação que **deixou de existir** — com `push`, o botão Voltar levaria a um
404 (ou, pior, a uma versão reusada do cache de back/forward, que o glossário
diz existir). `replace` elimina a entrada morta.

**Divergência consciente com `AcoesAluno.tsx`**, que usa `refresh()` + `push()`
no mesmo tipo de cenário. Não alinhar aquele arquivo nesta etapa — está fora do
escopo. Registrado em §25 (D3).

### 17.4 Verificação obrigatória em QA

A decisão acima é derivada da documentação da versão instalada, não medida.
**A U4 só é aceita depois do QA manual confirmar** que a ficha aparece sem a
avaliação excluída e com o contador decrementado.

Se o QA mostrar ficha desatualizada, o fallback é acrescentar `router.refresh()`
antes do `replace` **e registrar no código o motivo empírico**, corrigindo esta
seção. Não acrescentar preventivamente.

### 17.5 Fluxo completo

```
[Excluir avaliação]
   ↓ abre ConfirmDialog (modal, foco inicial em Cancelar, não fecha por clique fora)
   ↓ Cancelar → fecha, nada acontece
   ↓ Confirmar
      ↓ guarda: if (excluindo) return
      ↓ setExcluindo(true) → botões desabilitados
      ↓ excluirAvaliacao(id) → DELETE /api/avaliacoes/:id
         ├─ 204 (ok) ─────┐
         ├─ 404 ──────────┤ tratados como sucesso
         │                └→ setDialogAberto(false); router.replace(`/alunos/${alunoId}`)
         └─ 0 / 500 / outros
                          └→ setErroExclusao(mensagemDoErro(status)); setExcluindo(false)
                             dialog permanece aberto, valores preservados
```

**404 é sucesso**: o estado desejado — a avaliação fora do sistema — já foi
alcançado. Mesma decisão já tomada em `AcoesAluno.tsx:66-73`, com o comentário
que explica o porquê.

## 18. Confirmação, pending e erros

**Usar `ConfirmDialog`** (`components/ui/confirm-dialog.tsx`). Não usar
`window.confirm`. O componente já entrega: modal via Base UI `AlertDialog`, não
fecha por clique fora, `initialFocus` no botão Cancelar (linha 52), bloqueio de
Escape durante `pendente` (linhas 44-46), erro em `role="alert"` (linha 63) e
rótulo pendente "Excluindo…" (linha 89).

Props:

```tsx
<ConfirmDialog
  aberto={dialogAberto}
  aoMudarAberto={setDialogAberto}
  titulo="Excluir esta avaliação?"
  descricao={`Isso remove a avaliação de ${dataFormatada}, com todas as medidas de amplitude, resultados de salto e resultados de velocidade. Esta ação não pode ser desfeita.`}
  rotuloConfirmar="Excluir avaliação"
  aoConfirmar={confirmarExclusao}
  pendente={excluindo}
  erro={erroExclusao}
/>
```

A descrição declara o impacto real (a cascata do §5.2), no mesmo tom de
`AcoesAluno.tsx:18-26`.

**Pending**: `excluindo` desabilita confirmar e cancelar (o `ConfirmDialog` já
faz via `pendente`) e o botão externo "Excluir avaliação".

**Erros**: sempre `mensagemDoErro(status)` — **nunca** o campo `error` cru da
API (regra 4.7 do `frontend-plan.md`, implementada em `features/shared/erros.ts`).

**Duplo DELETE**: impedido por `if (excluindo) return` no início de
`confirmarExclusao` **mais** o `disabled`. Dois guardas, como na E5 — o
`disabled` sozinho tem janela de corrida antes do re-render.

## 19. Acessibilidade

Nasce junto, não fica para a E8:

- Um `<h1>` na página; cada bloco em `<section aria-labelledby="...">` com `<h2>`
  de id correspondente (padrão de `HistoricoAvaliacoes.tsx:34-36`).
- Tabelas com `<TableCaption className="sr-only">` descritiva, `scope="col"` nos
  cabeçalhos e `scope="row"` na primeira célula de cada linha.
- Rótulos com `<abbr title={nomeCompleto}>` para a sigla do professor —
  `RotuloColuna` já faz.
- `ValorOuAusente` garante que ausência seja anunciada como "não medido".
- Foco: `ConfirmDialog` põe foco em Cancelar ao abrir; ao fechar sem excluir, o
  foco deve voltar ao botão "Excluir avaliação" (comportamento nativo do
  `AlertDialog` do Base UI — **verificar em QA**).
- Erro do dialog em `role="alert"`.
- Alvos de toque `h-11` em telas pequenas, `sm:h-9` acima — convenção do projeto.
- Nenhuma informação transmitida só por cor.

## 20. Responsividade

Alvo principal tablet; verificar 360, 768 e 1280.

As tabelas da E6 têm **2 ou 3 colunas** — cabem em 360px. **Não aplicar
`min-w-max`**: aquilo existe em `HistoricoAvaliacoes.tsx:44` por causa das 13
colunas do histórico, e copiá-lo aqui criaria rolagem desnecessária.

Se alguma tabela precisar rolar, ela rola **dentro do próprio container** (o
`Table` já traz `overflow-x-auto`); a **página nunca** pode ter overflow
horizontal. Verificação objetiva em QA:
`document.body.scrollWidth === window.innerWidth`.

Container da página: `mx-auto w-full max-w-4xl px-6 py-12`, igual ao relatório e
à ficha.

## 21. Testes automatizados

**Infraestrutura real** (não presumir): `vitest.config.mts` usa
`environment: "node"` e `include: ["src/**/*.test.ts"]`. **Não há jsdom, nem
React Testing Library, nem `.tsx` na lista.** Componentes **não** são testáveis
hoje. **Não instalar bibliotecas** para mudar isso nesta etapa.

Foi por isso que a lógica foi extraída para `detalhe.ts` puro (§8) — é o que
torna o núcleo da E6 verificável automaticamente.

### 21.1 `features/avaliacoes/detalhe.test.ts` (novo)

Contra uma fixture de `AvaliacaoCompleta` construída à mão:

| # | Caso | Asserção |
|---|---|---|
| 1 | `linhasDoBloco(av, "amplitude")` | 8 linhas, na ordem do catálogo, com `lado` "direito"/"esquerdo" alternando |
| 2 | `linhasDoBloco(av, "salto")` | 5 linhas, `lado === null` em todas |
| 3 | **`null` preservado** | campo não medido → `valor === null` (nunca `0`) |
| 4 | **zero legítimo preservado** | campo com `0` → `valor === 0` (nunca `null`) |
| 5 | associação catálogo → campo | `amplitude.slb.esquerdo` chega na linha de `rotulo === "SLB ESQ"` |
| 6 | unidade do catálogo | TOR/QUA/IQT/SLB/CMJ → `unidade === "cm"` |
| 7 | **unidade `null`** | salto2..salto5 → `unidade === null` |
| 8 | formatação | `formatarNumeroOuTraco(0) === "0"` e `(null) === "—"` |

### 21.2 `features/avaliacoes/acoes.test.ts` (ampliar)

Com `fetch` mockado, no padrão já usado em `integracaoV2.test.ts`:

| # | Caso | Asserção |
|---|---|---|
| 9 | DELETE sucesso | 204 → `{ ok: true }`; chamou `/api/avaliacoes/{id}` com `method: "DELETE"` |
| 10 | DELETE 404 | `{ ok: false, erro.status: 404 }` — o mapeamento para "sucesso" é do componente, não da action |
| 11 | DELETE 500 | `erro.status === 500` |
| 12 | DELETE rede | `fetch` rejeita → `erro.status === 0` |
| 13 | id encodado | id com caractere especial → `encodeURIComponent` aplicado |

**Não testável automaticamente** (vai para §22): renderização, foco do dialog,
prevenção de duplo clique na UI, responsividade, navegação.

## 22. QA manual no navegador

Pré-requisito: `npm run dev`. Não resetar o banco.

**Round-trip (o critério central):**
1. Criar avaliação nova pela E5 com valores conhecidos, incluindo
   deliberadamente **um campo com `0`**, **vários vazios**, CMJ preenchido e
   um par carga/tempo.
2. Abrir o detalhe e conferir **valor a valor** contra o que foi digitado.
3. Campo vazio aparece **"—"**; o campo com zero aparece **"0"**. Nenhum dos
   dois se transforma no outro.

**Unidades:**
4. TOR/QUA/IQT/SLB/CMJ mostram `(cm)`.
5. Os quatro saltos provisórios aparecem **sem unidade nenhuma** — nem `cm`,
   nem `%`, nem `m/s`, nem `()` vazio — e a `NotaUnidadeProvisoria` aparece
   uma única vez abaixo da tabela.

**Navegação:**
6. Ficha → clicar na data do histórico → **abre o detalhe** (não o relatório).
7. Detalhe → "Ver relatório" → abre o relatório correto.
8. Detalhe → "← Ficha do aluno" e o nome do aluno → voltam à ficha certa.

**404:**
9. `/avaliacoes/id-inexistente` e `/avaliacoes/nao-e-uuid` → ambos caem no
   not-found, não em erro 500.

**Exclusão:**
10. "Excluir avaliação" abre o dialog; foco inicial em **Cancelar**.
11. Cancelar fecha sem excluir; **o foco volta ao botão "Excluir avaliação"**.
12. Confirmar exclui e volta para a ficha.
13. **A ficha não mostra mais a avaliação excluída e o contador caiu** —
    verificação da decisão §17.3.
14. **Voltar (Back) após excluir não retorna à avaliação morta** — confirma o
    `replace`.
15. Duplo clique rápido em "Excluir avaliação" no dialog dispara **um** DELETE
    (verificar no painel Network).

**Responsividade e teclado:**
16. 360 / 768 / 1280 sem overflow horizontal da página
    (`document.body.scrollWidth === window.innerWidth`).
17. Navegação só por teclado: alcançar "Ver relatório", "Excluir avaliação",
    abrir o dialog, confirmar e cancelar.

## 23. Unidades de implementação

### U1 — Rota, loader, 404 e error

**Objetivo.** `/avaliacoes/[id]` existe, carrega a avaliação e trata ausência.

**Arquivos.** Criar `features/avaliacoes/dados.ts`,
`app/avaliacoes/[id]/{page,loading,error,not-found}.tsx`.

**Mudança.** `carregarAvaliacao` com `cache()` (§8). Página Server com
`generateMetadata`, `notFound()` em 404 e `throw` nos demais (§9). Renderizar
por ora só o cabeçalho do §16 e o link "← Ficha do aluno". Os três
`loading/error/not-found` copiam a estrutura dos equivalentes do relatório (§10).

**Testes.** Nenhum automatizado (não há lógica pura ainda).

**QA.** Itens 8 e 9 do §22.

**Aceite.** `/avaliacoes/{id-real}` mostra nome do aluno e data; título da aba
correto; id inexistente **e** id malformado caem no not-found; gates verdes.

**Commit.** `feat(avaliacoes): adiciona rota de detalhe com carregamento e 404`

---

### U2 — Blocos Amplitude e Salto, com lógica pura testada

**Objetivo.** Os dois blocos de `Medida` na tela, e a regra `null`/zero coberta
por teste.

**Arquivos.** Criar `features/avaliacoes/detalhe.ts`, `detalhe.test.ts`,
`BlocoMedidas.tsx`. Alterar `app/avaliacoes/[id]/page.tsx`.

**Mudança.** `linhasDoBloco` reusando `colunasDeMedida()` e `valorDaColuna()`
(§8) — **sem reimplementar a derivação do catálogo**. `BlocoMedidas` com
`RotuloColuna`, `ValorOuAusente` e `NotaUnidadeProvisoria` (§11, §12).

**Testes.** Casos 1–8 do §21.1.

**QA.** Itens 1–5 do §22.

**Aceite.** 8 linhas em Amplitude e 5 em Salto, na ordem do catálogo; valores
idênticos aos digitados na E5; vazio "—" e zero "0"; saltos provisórios sem
unidade + nota; gates verdes.

**Commit.** `feat(avaliacoes): exibe blocos de amplitude e salto no detalhe`

---

### U3 — Velocidade (com extração) e observações

**Objetivo.** Terceiro bloco na tela, compartilhando a tabela com a ficha.

**Arquivos.** Criar `features/avaliacoes/VelocidadeTabelaAvaliacao.tsx`.
Alterar `features/alunos/VelocidadeAvaliacao.tsx` e
`app/avaliacoes/[id]/page.tsx`.

**Mudança.** Extração exatamente como especificado em §13 — mover só o
`<Table>`, manter título/data/wrapper na ficha. Bloco de observações com
`EmptyState` quando vazio (§11).

**Testes.** Nenhum novo (componentes não são testáveis, §21). Os 94 testes
existentes devem continuar verdes — inclusive `features/alunos/utils.test.ts`,
que a extração **não** deve afetar.

**QA.** Conferir carga/tempo no detalhe **e** que a ficha do aluno continua
idêntica ao que era antes (a extração não pode alterar a aparência dela).

**Aceite.** Dois exercícios sempre presentes; não medido "—"; ficha inalterada
visualmente; gates verdes.

**Commit.** `feat(avaliacoes): exibe velocidade e observacoes no detalhe`

---

### U4 — Exclusão

**Objetivo.** Excluir a avaliação com confirmação e voltar à ficha atualizada.

**Arquivos.** Criar `features/avaliacoes/AcoesAvaliacao.tsx`. Alterar
`features/avaliacoes/acoes.ts`, `acoes.test.ts`,
`app/avaliacoes/[id]/page.tsx`.

**Mudança.** `excluirAvaliacao` (§8); ilha Client com `ConfirmDialog` (§18);
navegação `router.replace` sem `refresh` (§17.3).

**Testes.** Casos 9–13 do §21.2.

**QA.** Itens 10–15 do §22 — **incluindo a verificação obrigatória do §17.4**.

**Aceite.** Confirmação obrigatória; 204 e 404 voltam à ficha; a avaliação some
da lista e o contador cai; erro mantém o dialog aberto com mensagem traduzida;
duplo clique dispara um único DELETE; Back não volta à avaliação excluída;
gates verdes.

**Commit.** `feat(avaliacoes): exclui avaliacao com confirmacao`

---

### U5 — Atalho para relatório, navegação da ficha e fechamento

**Objetivo.** Fechar o ciclo Ficha → Detalhe → Relatório e registrar a etapa.

**Arquivos.** Alterar `app/avaliacoes/[id]/page.tsx`,
`features/alunos/HistoricoAvaliacoes.tsx`, `docs/frontend-plan.md`.

**Mudança.** Ação "Ver relatório" (§15); trocar o destino do link da data
(§14); marcar E6 como concluída no `frontend-plan.md` e **registrar a edição de
avaliação como trabalho futuro separado** (§26), sem especificá-la.

**Testes.** Nenhum novo.

**QA.** Itens 6, 7, 16 e 17 do §22, mais uma passada completa no §22.

**Aceite.** Fluxo Ficha → Detalhe → Relatório funciona; nenhuma coluna
"Detalhes" foi criada; sem overflow horizontal em 360/768/1280; navegação por
teclado completa; gates verdes.

**Commits.** `feat(avaliacoes): liga detalhe ao relatorio e a ficha` seguido de
`docs: registra conclusao da E6 e edicao como trabalho futuro`

## 24. Arquivos protegidos

**Não alterar em nenhuma unidade:**

```
prisma/**                         (schema, migrations, seed)
src/lib/**                        (contrato, catálogo, serialização, http)
src/app/api/**                    (todos os route handlers)
docs/api.md
docs/evaluation-model-v2-proposal.md
docs/e5-v2-implementation-spec.md
docs/e5-v2-execution-prompt.md
src/features/relatorio/**         (inclui o bug D1 — registrar, não corrigir)
src/app/avaliacoes/[id]/relatorio/**
```

**Arquivos da E5 que não podem ser tocados** (a E5 está entregue e validada):

```
src/features/avaliacoes/AvaliacaoFormV2.tsx
src/features/avaliacoes/AmplitudeFieldset.tsx
src/features/avaliacoes/SaltosFieldset.tsx
src/features/avaliacoes/VelocidadeFieldset.tsx
src/features/avaliacoes/mappers.ts
src/features/avaliacoes/integracaoV2.ts
src/features/avaliacoes/rascunho.ts
src/features/avaliacoes/tipos.ts
src/features/avaliacoes/catalogoV2.ts
src/features/avaliacoes/decimal.ts
src/app/alunos/[id]/avaliacoes/nova/**
```

`features/avaliacoes/acoes.ts` **pode** ser alterado, mas **apenas** para
acrescentar `excluirAvaliacao`. Não tocar em `criarAvaliacaoV2`.

Em `features/alunos/`, **somente** `VelocidadeAvaliacao.tsx` (§13) e
`HistoricoAvaliacoes.tsx` (§14). `utils.ts`, `utils.test.ts`, `tipos.ts`,
`RotuloColuna.tsx`, `AcoesAluno.tsx` e `AlunoForm.tsx` ficam intocados.

## 25. Riscos e débitos conhecidos

**D1 — Bug de unidade no relatório (pré-existente, não corrigir).**
`src/features/relatorio/MedidasTabela.tsx:34` imprime o cabeçalho fixo
`"Valor (cm)"` para as 9 medidas, incluindo os 4 saltos cujo catálogo diz
`unidade: null`. O relatório afirma "cm" onde o catálogo diz "desconhecida".
Fora do escopo da E6. **A E6 representa as unidades corretamente
independentemente disso** (§12) — as duas telas vão divergir até o débito ser
pago, e isso é esperado.

**D2 — Dependência entre features (reuso temporário aceitável).**
`AvaliacaoCompleta` (`features/alunos/tipos.ts`), `colunasDeMedida()`,
`valorDaColuna()` (`features/alunos/utils.ts`) e `RotuloColuna` /
`NotaUnidadeProvisoria` (`features/alunos/RotuloColuna.tsx`) são conceitos do
domínio **avaliação** que moram em `features/alunos` porque foi ali que
apareceram primeiro. A E6 vai importá-los de lá.

*Por que isso é aceitável agora:* são funções puras e componentes de
apresentação, já cobertos por `utils.test.ts`, sem dependência de estado da
feature de alunos.

*Por que mover agora teria blast radius desnecessário:* `utils.ts` é consumido
por `HistoricoAvaliacoes`, `ComparacaoAvaliacoes` e `utils.test.ts`; movê-lo
obrigaria a editar arquivos de leitura já entregues e validados, num commit que
não entrega nada ao usuário, e a misturar refatoração com funcionalidade nova
numa mesma etapa. **A extração aprovada da tabela de velocidade (§13) é
pontual e não autoriza reorganizar `features/alunos`.**

*Débito resultante:* a direção da dependência fica invertida
(`features/avaliacoes` → `features/alunos`). Endereçar numa etapa própria de
arquitetura, depois da E6.

**D3 — Divergência de padrão de navegação pós-mutação.**
`AcoesAluno.tsx:76-77` e `AlunoForm.tsx:93-94` usam `refresh()` + `push()`; a
E6 usa `replace()` sem `refresh()` (§17.3), decisão baseada na documentação da
versão instalada. Não alinhar os arquivos antigos nesta etapa. Se o QA (§17.4)
contradisser a decisão, corrigir a E6 e esta seção — não os arquivos antigos.

**D4 — `api.md` sem seção dedicada para `GET`/`DELETE /avaliacoes/:id`** (§5.3).

**D5 — Débito editorial herdado da E5:** o bloco "Bloqueios do modelo v2"
(B6–B10) em `frontend-plan.md` §12 continua desatualizado, já sinalizado por
aviso no próprio documento. Fora do escopo.

**R1 — Risco de regressão na ficha pela extração (§13).** Mitigação: a `props`
do componente novo recebe só `avaliacao.velocidade`, o wrapper permanece no
arquivo antigo, e o QA da U3 exige conferir que a ficha ficou visualmente
idêntica.

**R2 — Risco de `criadoEm` quebrar a formatação** (§16): é ISO completo, não
`"AAAA-MM-DD"`. Mitigação: `slice(0, 10)` antes de `formatarData`, com
comentário no código.

## 26. Trabalho futuro registrado (não implementar)

**Edição de avaliação.** `PATCH /avaliacoes/:id` existe, está em formato v2,
aceita bloco a bloco e é transacional (`src/app/api/avaliacoes/[id]/route.ts:51`,
`atualizarAvaliacaoSchema` em `src/lib/schemas.ts:151`). O frontend não a
consome. É **trabalho futuro separado**, fora da E6 por decisão de produto
(08/08/2026).

Na U5, acrescentar essa nota ao `docs/frontend-plan.md` **sem especificar a
etapa**: registrar que o endpoint está pronto e que a tela de edição continua no
roadmap como etapa própria. Isto também resolve a ambiguidade em que R6 e B5
daquele documento sugeriam que a edição sairia junto com a E6.

## 27. Gates

Após **cada** unidade, e todos de novo ao final:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Nenhuma unidade é considerada concluída com qualquer gate vermelho. Não
commitar com gate vermelho. Não usar `--no-verify`.

## 28. Sequência exata de commits

| # | Unidade | Mensagem |
|---|---|---|
| 1 | U1 | `feat(avaliacoes): adiciona rota de detalhe com carregamento e 404` |
| 2 | U2 | `feat(avaliacoes): exibe blocos de amplitude e salto no detalhe` |
| 3 | U3 | `feat(avaliacoes): exibe velocidade e observacoes no detalhe` |
| 4 | U4 | `feat(avaliacoes): exclui avaliacao com confirmacao` |
| 5 | U5 | `feat(avaliacoes): liga detalhe ao relatorio e a ficha` |
| 6 | U5 | `docs: registra conclusao da E6 e edicao como trabalho futuro` |

Commits locais, na branch `feat/evaluation-detail`. **Sem push, sem merge, sem
rebase, sem troca de branch** — salvo instrução explícita posterior.

O corpo de cada mensagem deve explicar a decisão não óbvia da unidade (por que
`replace` sem `refresh` na U4; o que exatamente foi extraído e o que ficou na
U3), no tom já usado nos commits do repositório.

## 29. Checklist final

Antes de declarar a E6 concluída:

- [ ] `/avaliacoes/[id]` renderiza os três blocos e as observações
- [ ] Round-trip conferido valor a valor contra o que a E5 gravou
- [ ] Campo vazio aparece "—"; campo com zero aparece "0"
- [ ] Nenhuma unidade inventada nos quatro saltos provisórios; nota presente
- [ ] Unidades vindas de `src/lib/medidas.ts`, sem segunda fonte de verdade
- [ ] `loading`, `error` e `not-found` existem e funcionam
- [ ] id inexistente **e** id malformado caem no not-found
- [ ] Ficha → Detalhe → Relatório funciona; sem coluna "Detalhes"
- [ ] Exclusão exige confirmação e trata 204/404/500/rede
- [ ] Após excluir, a ficha aparece sem a avaliação e com o contador correto
- [ ] Back após excluir não volta à avaliação removida
- [ ] Duplo clique dispara um único DELETE
- [ ] Foco inicial em Cancelar; foco volta ao botão ao cancelar
- [ ] 360 / 768 / 1280 sem overflow horizontal da página
- [ ] Navegação completa por teclado
- [ ] Ficha do aluno visualmente idêntica ao que era antes da extração (§13)
- [ ] Nenhum arquivo protegido (§24) foi alterado
- [ ] `PATCH`/edição **não** foram implementados; registrados como futuro (§26)
- [ ] Bug do relatório (D1) **não** foi corrigido, apenas registrado
- [ ] Os 5 gates verdes (§27)
- [ ] 6 commits, na ordem do §28, sem push
