# E4 — Formulário de aluno

Especificação operacional da etapa E4. Escrita em **01/08/2026**, a partir de
investigação empírica contra a API real (requisições POST/PATCH/DELETE com dados
temporários, criados e removidos) e do comportamento medido no navegador
(Chrome 150 headless via CDP).

Autoridade acima deste documento, nesta ordem:
[`api.md`](api.md) → [`frontend-plan.md`](frontend-plan.md) → esta spec.

Série: [E1](e1-implementation-spec.md) · [E2](e2-implementation-spec.md) ·
[E3](e3-implementation-spec.md) · **E4**.

> **Nota de branch.** A tarefa de planejamento citou `feat/student-form`; a
> branch realmente existente no repositório é **`feat/student-crud`**, criada a
> partir da `main` atualizada, working tree limpo. O implementador trabalha na
> branch em que a sessão abrir — não criar nem trocar de branch.

---

## 1. Resumo

### 1.1 Objetivo

Entregar as duas telas de escrita mais simples do sistema — criar e editar aluno
— junto com inativação e exclusão, estabelecendo o **padrão de formulário** que a
E5 vai reaplicar num artefato dez vezes maior.

### 1.2 Valor para o produto

Até aqui o sistema só lê. Todo dado vem do seed. A E4 é o primeiro momento em que
o professor pode colocar um aluno de verdade no sistema — e o primeiro em que o
frontend pode destruir dado. Os dois lados dessa fronteira (validação honesta e
exclusão consciente) são o que esta etapa entrega.

### 1.3 Por que a E4 precede a E5

O formulário de avaliação (E5) é o risco R1 do `frontend-plan.md`: array dinâmico
de testes e tentativas, decimais em pt-BR, distinção vazio × zero, mapeamento de
422 aninhado (`testes.0.tentativas.1.carga.valor`) e prevenção de duplicata.
Estrear todos esses mecanismos de uma vez é como o fluxo central do produto
quebra.

A E4 exercita **os mesmos mecanismos** — `FormData`, campos não-controlados,
`useActionState`, `pending`, mapeamento de `issues[].field`, foco no primeiro
erro, `aria-live`, prevenção de duplo submit, `router.refresh()` — num formulário
de **dois campos**. O que a E5 herda pronto: o componente de campo, o formato do
estado da ação, o utilitário de mapeamento de erros e o `ConfirmDialog`.

### 1.4 Escopo

- `/alunos/novo` — criação.
- `/alunos/[id]/editar` — edição.
- Inativar / reativar aluno.
- Excluir aluno, com confirmação que informa o impacto real.
- Aviso de nome semelhante, sem bloquear.
- Validação em três camadas (HTML → Zod no cliente → servidor).
- Mapeamento de `issues[].field` para os campos.
- `pending`, prevenção de duplo submit, preservação de valores após erro.
- Correção cirúrgica do bug de foco compartilhado (§2.7).
- Ações expostas na lista e na ficha já existentes.

### 1.5 Fora de escopo

Formulário, criação ou edição de avaliação · criação inline de aluno dentro da
avaliação · autenticação · filiais · importação de planilha · qualquer alteração
em `prisma/**`, `src/app/api/**` ou `src/lib/**` · novas fórmulas · relatório ·
compartilhamento · biblioteca de formulários (React Hook Form ou qualquer outra)
· store global · resolução global dos tokens da Nova · qualquer entregável da E5
em diante.

---

## 2. Estado atual

### 2.1 Rotas existentes

| Rota | Tipo | Papel |
| --- | --- | --- |
| `/` | Server | redireciona para `/alunos` |
| `/alunos` | Server (`ƒ`) | lista; busca `GET /api/alunos` inteiro e passa para um Client Component |
| `/alunos/[id]` | Server (`ƒ`) | ficha; `GET /api/alunos/:id` + `GET /api/avaliacoes?alunoId=` |
| `/avaliacoes/[id]/relatorio` | Server (`ƒ`) | relatório (E2/E3) |

**Não existe** `/alunos/novo` nem `/alunos/[id]/editar`.

### 2.2 Boundaries existentes

```
src/app/error.tsx              src/app/not-found.tsx
src/app/alunos/loading.tsx     src/app/alunos/error.tsx
src/app/alunos/[id]/loading.tsx  error.tsx  not-found.tsx
```

Consequência para a E4: `error.tsx` de `/alunos` cobre `/alunos/novo`;
`error.tsx` e `not-found.tsx` de `/alunos/[id]` cobrem `/alunos/[id]/editar`.
**Só faltam `loading.tsx` próprios** — o de `/alunos` mostraria o esqueleto da
lista numa rota de formulário. Ver §13.

### 2.3 Componentes de UI reutilizáveis

`src/components/ui/`: `badge`, `button`, `card`, `chart`, `empty-state`,
`error-state`, `input`, `skeleton`, `table`, `valor-ausente`.

**Não existe**: `label`, `dialog`, `alert-dialog`, `checkbox`, `switch`, `form`,
componente de campo. A E4 cria o que precisar (§13).

### 2.4 Feature `alunos` existente

`AlunoCabecalho` · `AlunosTabela` · `BuscaEFiltroAlunos` (Client) ·
`ComparacaoAvaliacoes` · `HistoricoAvaliacoes` · `TestesAvaliacao` ·
`tipos.ts` · `utils.ts`.

**Reaproveitamento obrigatório:** `normalizarTexto` de
`src/features/alunos/utils.ts` (trim + NFD + remoção de diacríticos +
minúsculas). Já é usada por `filtrarAlunos` dentro de um Client Component
(`BuscaEFiltroAlunos.tsx`) — client-safety **provada pelo código existente**.
Não escrever outra normalização.

### 2.5 Helpers compartilhados

| Módulo | Conteúdo | Client-safe? |
| --- | --- | --- |
| `features/shared/api.ts` | `apiFetch<T>`, `ResultadoApi<T>`, `ProblemaApi` | **sim** — não importa `next/headers`; comentário no arquivo declara isso |
| `features/shared/erros.ts` | `mensagemDoErro(status)` → português acentuado | sim |
| `features/shared/formato.ts` | datas, números, idade, data de emissão | sim |
| `features/shared/origem.ts` | `origemAtual()` | **não** — usa `headers()`; só Server |

`apiFetch` já trata 204 sem ler corpo (`api.ts:31-33`) e já mapeia falha de rede
para `status: 0`. **Nada disso precisa ser reescrito na E4.**

### 2.6 Pendência dos tokens da Nova

`src/app/globals.css` define **apenas** `--background` e `--foreground` (mais as
fontes). Todos os demais tokens do shadcn (`--card`, `--popover`, `--border`,
`--muted-foreground`, `--primary`, `--destructive`, `--ring`, `--input`) **não
existem**, e as classes que dependem deles não geram CSS nenhum.

Consequências medidas que a E4 precisa conhecer:

- `bg-popover`, `bg-card`, `bg-muted` → **transparente**.
- `text-muted-foreground` → herda a cor primária (sem hierarquia).
- `border-input`, `border-border` → caem em `currentColor`.
- `text-destructive` → **não gera CSS**: um erro estilizado só com essa classe
  fica **invisível como erro** (mesma cor do texto normal).

**Regra da E4:** nunca depender de cor para comunicar. Erro tem texto, ícone
textual ou marcação estrutural, e `aria-invalid`. Onde um fundo for
indispensável (o popup do diálogo), usar **`bg-background`**, que existe.
Resolver os tokens globalmente permanece **parada obrigatória** (§23).

### 2.7 Bug de foco compartilhado — diagnóstico fechado

A E3 registrou o sintoma. Esta investigação fechou a causa, empiricamente, lendo
o CSS compilado e percorrendo o foco com `Tab` real via CDP:

```css
@property --tw-outline-style { syntax: "*"; inherits: false; initial-value: solid; }
.outline-none                          { --tw-outline-style: none; outline-style: none; }
.focus-visible\:outline-2:focus-visible { outline-style: var(--tw-outline-style); outline-width: 2px; }
```

`button.tsx` e `input.tsx` têm **`outline-none` na base**, que fixa
`--tw-outline-style: none` permanentemente. A regra de `focus-visible` lê essa
mesma variável — e resolve para `none`. O elemento entra em `:focus-visible`,
mas desenha outline nenhum.

Medição em `/alunos`, com `Tab` real:

| Elemento | `:focus-visible` | `outline-style` | Foco visível? |
| --- | --- | --- | --- |
| `<input data-slot="input">` (busca) | `true` | `none` | **não** |
| `<button data-slot="button">` (Todos/Ativos/Inativos) | `true` | `none` | **não** |
| `<a>` (nome do aluno na tabela) | `true` | `solid` | sim |

Os links funcionam porque **não** têm `outline-none`.

**Correção validada em memória** (regra injetada via CDP, sem tocar em arquivo):
restaurar `--tw-outline-style: solid` no estado `:focus-visible` faz os cinco
primeiros elementos focáveis passarem a `solid 2px offset 2px`. Em Tailwind v4
isso é exatamente o que o utilitário **`focus-visible:outline-solid`** gera.

**Decisão: a E4 corrige — uma classe em `button.tsx`, uma em `input.tsx`.**
Justificativa: a E4 introduz o primeiro formulário e o primeiro diálogo modal do
sistema; "navegação completa por teclado com foco visível" é critério de aceite
desta própria etapa (§19) e é **incumprível** com o bug de pé. A correção não
toca tokens, não muda cor, não redesenha nada e não reabre o registro do shadcn —
é o mínimo que torna a E4 verificável. **Qualquer coisa além disso (revisão de
design, tokens, variantes) está fora de escopo.**

### 2.8 Divergências anteriores relevantes

| # | Divergência | Situação |
| --- | --- | --- |
| D3 | `PATCH /alunos/:id` não consegue limpar `dataNascimento` | **confirmada empiricamente** (§4.4) — era dúvida, agora é fato |
| D5 | `POST`/`PATCH /alunos` não devolvem `totalAvaliacoes` | **confirmada** (§4.1) |
| — | Regra ESLint `no-restricted-imports` de `frontend-plan.md` §7.4 **nunca foi implementada** — `eslint.config.mjs` não tem a regra | registrada; **não** corrigir na E4 (altera arquivo compartilhado, §0.2 do plano) |
| — | 409 é **inalcançável** em `/alunos`: `Aluno.nome` não tem `@@unique` no schema | §4.1 |

---

## 3. Fontes de verdade

| Categoria | Item |
| --- | --- |
| Rotas da API | `src/app/api/alunos/route.ts` (GET, POST) · `src/app/api/alunos/[id]/route.ts` (GET, PATCH, DELETE) |
| Schemas | `criarAlunoSchema`, `atualizarAlunoSchema` em `src/lib/schemas.ts` |
| Tipos de entrada | `CriarAlunoDTO`, `AtualizarAlunoDTO` (`src/lib/schemas.ts`) |
| Tipos de saída | `AlunoResumo`, `AlunoDetalhe` em `src/features/alunos/tipos.ts` |
| Tradução de erro | `src/lib/http.ts` (`toErrorResponse`) ↔ `src/features/shared/erros.ts` |
| Modelo | `prisma/schema.prisma` — `Aluno`, e `onDelete: Cascade` em `Avaliacao` |
| Documentação | `docs/api.md`, `docs/frontend-plan.md` §4.7, §5.5, §6, §7 |
| Componentes | `src/components/ui/*`, `src/features/alunos/utils.ts` |
| Comportamento empírico | §4 desta spec — medido, não lido |

---

## 4. Contratos reais

Todos verificados por requisição real contra `localhost:3000` em 01/08/2026, com
alunos temporários criados e removidos.

### 4.1 `POST /api/alunos`

**Entrada:** `criarAlunoSchema` — `{ nome, dataNascimento?, ativo? }`.
**Saída (201):** `{ id, nome, dataNascimento, ativo }` — **sem `totalAvaliacoes`**.

| Caso | Status | Corpo |
| --- | --- | --- |
| `{nome:"X"}` (mínimo) | **201** | `{id, nome:"X", dataNascimento:null, ativo:true}` |
| `{nome, dataNascimento:"1990-05-20", ativo:false}` | **201** | ecoa os três campos |
| `{nome:"A"}` (1 caractere) | **422** | `issues:[{field:"nome", message:"Nome precisa de pelo menos 2 letras"}]` |
| `{nome:""}` | **422** | mesma issue |
| `{nome:"  A  "}` (1 letra após trim) | **422** | mesma issue — **trim roda antes do `min(2)`** |
| `{nome:"   Fulano   "}` | **201** | gravado **já aparado**: `"Fulano"` |
| `{dataNascimento:""}` | **422** | `field:"dataNascimento"`, `"dataNascimento no formato AAAA-MM-DD"` |
| `{dataNascimento:null}` | **422** | mesma issue |
| `{dataNascimento:"20/05/1990"}` | **422** | mesma issue |
| `{dataNascimento:"1990-02-31"}` | **422** | mesma issue — dia inexistente é rejeitado |
| campo desconhecido (`apelido`, `id`) | **201** | **silenciosamente descartado** (Zod strip) |
| JSON malformado | **400** | `{error:"Corpo da requisicao nao e um JSON valido"}` |
| dois campos inválidos | **422** | `issues` com **as duas**, na ordem do schema (`nome`, depois `dataNascimento`) |
| **nome duplicado** | **201** | **criado normalmente** — não há `@@unique` em `Aluno.nome` |

**Consequência decisiva:** `409` é **inalcançável** nesta rota. O aviso de nome
duplicado é 100% responsabilidade do cliente (§11), e não existe erro do servidor
para tratar nesse caso.

### 4.2 `GET /api/alunos/:id`

**Saída (200):** `{ id, nome, dataNascimento, ativo, avaliacoes: [{id, dataAvaliacao, observacoes}] }`.

| Caso | Status | Corpo |
| --- | --- | --- |
| id existente | **200** | objeto acima |
| id **malformado** (`nao-e-uuid`) | **404** | `{error:"Aluno nao encontrado"}` |
| UUID válido inexistente | **404** | idem |

`dataNascimento` vem como **`"AAAA-MM-DD"`** (`formatarData` do backend,
`src/lib/avaliacoes.ts:130`) — exatamente o formato que `<input type="date">`
consome em `defaultValue`, **sem conversão**.

**Fonte do impacto da exclusão:** `avaliacoes.length`. É o número que a
confirmação de exclusão precisa (§10).

### 4.3 `PATCH /api/alunos/:id`

**Entrada:** `atualizarAlunoSchema` = `criarAlunoSchema.partial()`.
**Saída (200):** `{ id, nome, dataNascimento, ativo }` — **sem `avaliacoes`, sem `totalAvaliacoes`**.

| Caso | Status | Observação |
| --- | --- | --- |
| `{nome}` só | **200** | demais campos intactos |
| `{dataNascimento}` só | **200** | |
| `{ativo:false}` / `{ativo:true}` | **200** | |
| **`{}` (vazio)** | **200** | no-op válido, devolve o aluno inalterado |
| `{nome:"A"}` | **422** | `field:"nome"` |
| `{dataNascimento:"xx"}` | **422** | `field:"dataNascimento"` |
| id malformado | **404** | `{error:"Registro nao encontrado"}` (P2025) |
| UUID inexistente | **404** | idem |

### 4.4 D3 confirmada — `dataNascimento` não pode ser limpa

| Tentativa | Resultado |
| --- | --- |
| `{dataNascimento: null}` | **422** — `invalid_type` |
| `{dataNascimento: ""}` | **422** — `invalid_format` |
| campo **ausente** do payload | **200**, e a data **permanece a antiga** |

Não existe caminho para gravar `NULL` em `dataNascimento` via PATCH. O schema é
`.optional()`, nunca `.nullable()`. Tratamento obrigatório na interface: §8.4.

### 4.5 `DELETE /api/alunos/:id`

| Caso | Status | Corpo |
| --- | --- | --- |
| id existente | **204** | **vazio, 0 bytes** |
| id malformado | **404** | `{error:"Registro nao encontrado"}` |
| UUID inexistente | **404** | idem |
| **segundo DELETE do mesmo id** | **404** | idem — duplo clique produz "Registro não encontrado" |

**Cascata verificada na prática:** aluno com 3 avaliações → `DELETE` 204 → as 3
avaliações passam a responder **404** em `GET /api/avaliacoes/:id`. O
`onDelete: Cascade` do `prisma/schema.prisma` funciona.

**A API não avisa nada antes de excluir.** Não há endpoint de prévia, nem o corpo
do 204 traz contagem. O impacto tem de vir de `GET /alunos/:id` → `avaliacoes.length`
(ou de `GET /alunos` → `totalAvaliacoes`), **antes** de abrir a confirmação.

### 4.6 `GET /api/alunos`

**Saída (200):** `AlunoResumo[]` = `{id, nome, dataNascimento, ativo, totalAvaliacoes}[]`,
ordenado por `nome` ascendente.

Query params: `?ativo=true|false`, `?busca=<texto>`.
Medido: `busca=ana` e `busca=ANA` devolvem ambos "Ana Prado" (o `LIKE` do SQLite
é insensível a caixa para ASCII) — mas **não** é insensível a acento. Por isso o
front continua filtrando no cliente com `normalizarTexto`, e §11 usa a **lista
completa**, não a busca do servidor.

### 4.7 Divergências entre `api.md` e a implementação

| Divergência | Postura da E4 |
| --- | --- |
| `POST`/`PATCH` não devolvem `totalAvaliacoes` (D5) | não depender disso; após mutação, recarregar a tela de destino |
| `PATCH` não limpa `dataNascimento` (D3) | §8.4 — guarda no cliente + dependência registrada |
| 409 documentado como possível, mas inalcançável em `/alunos` | mapear mesmo assim (§12), sem construir UX em cima dele |
| `GET` com id malformado devolve 404, não 422 | `notFound()` cobre os dois casos — igual à E1 |

---

## 5. Modelo de estado do formulário

### 5.1 Princípios herdados

`frontend-plan.md` §6.1–6.2: **`FormData` + campos não-controlados**. O estado do
React guarda apenas o resultado da última submissão — nunca o valor de cada
tecla.

### 5.2 Shape do estado da ação

Declarado em `src/features/alunos/tipos.ts`:

```ts
export type CampoAluno = "nome" | "dataNascimento";

export type ValoresAluno = {
  nome: string;
  dataNascimento: string; // "" quando ausente
};

export type EstadoAluno =
  | { status: "inicial" }
  | { status: "sucesso"; id: string }
  | {
      status: "erro";
      /** Erro geral: 400/404/409/500/rede. null quando só há erro de campo. */
      mensagem: string | null;
      errosPorCampo: Partial<Record<CampoAluno, string>>;
      /** Ecoa o que foi submetido — ver 5.4. */
      valores: ValoresAluno;
      /** Incrementa a cada submissão falha. Ver 5.6. */
      tentativa: number;
    };
```

Estado inicial: `{ status: "inicial" }`.

### 5.3 `useActionState`

Assinatura confirmada em `@types/react` (React 19.2.4):

```ts
useActionState<State, Payload>(
  action: (state: Awaited<State>, payload: Payload) => State | Promise<State>,
  initialState: Awaited<State>,
  permalink?: string,
): [state: Awaited<State>, dispatch: (payload: Payload) => void, isPending: boolean]
```

Uso na E4: `Payload = FormData`, ação **do cliente** (não Server Action) que faz
`fetch` relativo para `/api/...`. `apiFetch` é explicitamente client-safe (§2.5).

```tsx
const [estado, acao, pendente] = useActionState(criarAluno, { status: "inicial" });
// ...
<form action={acao}>
```

**Proibido** transformar isso em Server Action: exigiria `"use server"` e mudaria
a estratégia de dados de `frontend-plan.md` §2.3 — parada obrigatória (§23).

### 5.4 Preservação de valores após erro — regra inviolável

React 19 pode resetar formulários não-controlados após uma submissão via
`<form action={...}>` (a existência de `requestFormReset` em
`@types/react-dom` é o indício). **Este comportamento não foi medido nesta
investigação.**

Por isso a E4 **não depende do DOM** para preservar valores. A ação **ecoa os
valores submetidos** no estado (`valores`), e o formulário lê:

```tsx
defaultValue={
  estado.status === "erro" ? estado.valores.nome : (alunoInicial?.nome ?? "")
}
```

Assim os valores sobrevivem a um reset, se ele ocorrer, e o comportamento é
determinístico independentemente da versão do React. **Não usar `key` para
forçar remontagem** — isso destruiria o foco.

### 5.5 Erros gerais × erros por campo

| Origem | Onde aparece |
| --- | --- |
| `422` com `issues[]` | `errosPorCampo[field]`, sob o campo correspondente |
| `422` com `field` desconhecido (fora de `CampoAluno`) | `mensagem` geral — **nunca descartar silenciosamente** |
| `400`, `404`, `409`, `500`, rede (`status: 0`) | `mensagem` geral, vinda de `mensagemDoErro(status)` |

**Nunca exibir o campo `error` cru da API** (`frontend-plan.md` §4.7): as
mensagens do backend são sem acento (`"Dados invalidos"`). A **exceção** é
`issues[].message`, que é específica e já legível
(`"Nome precisa de pelo menos 2 letras"`) — exibir como veio.

### 5.6 Foco e `aria-live`

- Resumo de erros no topo do formulário, em `role="alert"`, apenas quando houver
  **mais de um** erro ou um erro geral.
- Após submissão falha, mover o foco para o **primeiro campo inválido** na ordem
  do DOM.
- O campo `tentativa` existe para que o `useEffect` de foco dispare **a cada
  submissão falha**, mesmo quando a mensagem é idêntica à anterior (sem ele, o
  estado seria referencialmente igual e o efeito não reexecutaria).

### 5.7 Reset entre submissões

Cada retorno da ação **substitui** o estado inteiro. Não acumular erros de
submissões anteriores, não fundir objetos. Sucesso descarta erros por construção
(variante `"sucesso"` não tem campo de erro).

---

## 6. Validação

### 6.1 Ordem das camadas

1. **HTML nativo** — `required`, `minLength={2}`, `type="date"`, `max` da data.
   Barreira imediata, sem JavaScript.
2. **Zod no cliente** — `criarAlunoSchema` / `atualizarAlunoSchema` importados de
   `@/lib/schemas` e executados com `safeParse` antes do `fetch`.
3. **Servidor** — autoridade final, sempre. Um 422 que chegue é exibido, nunca
   ignorado.

### 6.2 Client-safety dos schemas — verificada

`src/lib/schemas.ts` importa **apenas** `zod` e um `import type` de
`@/lib/medidas`. `src/lib/medidas.ts` **não tem nenhum import**. Nada de Prisma,
nada de `next/headers`. Importar `criarAlunoSchema` num Client Component é
seguro, e é exatamente o que `frontend-plan.md` §7.2 autoriza.

### 6.3 `FormData` → objeto: as três conversões obrigatórias

Medido com `FormData` real:

| Situação | O que chega | O que enviar |
| --- | --- | --- |
| `<input type="date">` vazio | `""` | **`undefined`** (omitir a chave) — `""` e `null` dão 422 |
| `<input type="checkbox">` desmarcado | a chave **nem existe** | `false` |
| `<input type="checkbox">` marcado | `"on"` (string) | `true` |

Helper obrigatório em `src/features/alunos/mappers.ts`:

```ts
export function formDataParaAluno(fd: FormData): {
  nome: string;
  dataNascimento?: string;
} {
  const nome = String(fd.get("nome") ?? "");
  const data = String(fd.get("dataNascimento") ?? "").trim();
  return { nome, ...(data ? { dataNascimento: data } : {}) };
}
```

**Sempre enviar `nome` como string, mesmo vazia.** Medido: omitir a chave produz
a mensagem feia `"Invalid input: expected string, received undefined"`; enviar
`""` produz a mensagem boa `"Nome precisa de pelo menos 2 letras"`.

### 6.4 `trim`

`z.string().trim()` **transforma a saída**: `safeParse("  Ze  ").data.nome === "Ze"`.
Enviar ao servidor **`resultado.data`**, não o `FormData` cru — assim o valor
gravado é o mesmo que o cliente validou.

### 6.5 Paths de `issues[]` — mapeamento 1:1

Medido, tanto no Zod local quanto na resposta real da API: os paths são planos e
de um só elemento.

| Entrada inválida | `issue.path` | `field` |
| --- | --- | --- |
| `nome` curto/vazio | `["nome"]` | `"nome"` |
| `dataNascimento` inválida | `["dataNascimento"]` | `"dataNascimento"` |
| `ativo` não-booleano | `["ativo"]` | `"ativo"` |

Como o atributo `name` de cada input é **exatamente** esse valor, o mapeamento
erro→campo é uma indexação direta. Sem tabela de tradução.

### 6.6 Mensagens

| Campo | Mensagem |
| --- | --- |
| `nome` | `"Nome precisa de pelo menos 2 letras"` — vem do schema, cliente e servidor dizem o mesmo |
| `dataNascimento` (formato) | `"dataNascimento no formato AAAA-MM-DD"` é técnica demais para a tela. Exibir **`"Informe uma data válida."`** quando o erro vier da camada do cliente. Se vier do servidor, exibir a mensagem do servidor (regra de §5.5) — só acontece se o cliente for contornado |
| `dataNascimento` (tentativa de limpar) | §8.4 |

### 6.7 `ativo`

Não é campo de formulário na E4 (§9). Não aparece em nenhum `FormData`.

---

## 7. Criação — `/alunos/novo`

| Item | Decisão |
| --- | --- |
| Rota | `src/app/alunos/novo/page.tsx`, Server Component |
| Heading | `<h1>Novo aluno</h1>` |
| Link de volta | `← Alunos` para `/alunos`, acima do `h1` (mesmo padrão da ficha) |
| Campos | `nome` (obrigatório) · `dataNascimento` (opcional) |
| Valores iniciais | ambos vazios |
| `ativo` | **não exibido** — a API já cria com `ativo: true` |
| Dados do servidor | `GET /api/alunos` → passa `nomesExistentes: {id, nome}[]` para o formulário (§11) |
| Submit | `POST /api/alunos` com `resultado.data` do `safeParse` |
| Sucesso | **redirecionar para `/alunos`** |
| Falha | permanece na página, valores preservados (§5.4) |
| Duplicidade | aviso não-bloqueante (§11) |

**Por que `/alunos` e não a ficha do novo aluno.** `frontend-plan.md` §9/E4 traz
o critério explícito: *"Sucesso volta à lista já com o aluno visível (refresh
confirmado)"*. Ir para a ficha seria defensável em UX, mas o critério é do plano,
que tem autoridade acima desta spec — e a lista prova visualmente que a
atualização funcionou, que é o ponto da etapa. **Decidido: `/alunos`.**

Navegação após sucesso (§12.4):

```ts
router.refresh();
router.push("/alunos");
```

---

## 8. Edição — `/alunos/[id]/editar`

### 8.1 Busca inicial

Server Component. `GET /api/alunos/:id`. Resposta 404 (id malformado **ou**
inexistente) → `notFound()`, capturado por `src/app/alunos/[id]/not-found.tsx`,
que já existe. Outros erros → `throw`, capturado por `src/app/alunos/[id]/error.tsx`.

Também busca `GET /api/alunos` para os nomes existentes (§11). As duas chamadas
em `Promise.all`, com a **mesma ordem de tratamento da E1**: decidir pelo 404 do
aluno antes de qualquer outro erro.

### 8.2 Campos e valores iniciais

| Campo | Valor inicial |
| --- | --- |
| `nome` | `aluno.nome` |
| `dataNascimento` | `aluno.dataNascimento ?? ""` — já vem `"AAAA-MM-DD"`, direto no `defaultValue` |

`ativo` **não** aparece aqui (§9).

### 8.3 Diferenças em relação à criação

| | Criação | Edição |
| --- | --- | --- |
| Heading | "Novo aluno" | "Editar aluno" |
| Método | `POST /api/alunos` | `PATCH /api/alunos/:id` |
| Schema no cliente | `criarAlunoSchema` | `atualizarAlunoSchema` |
| Destino no sucesso | `/alunos` | **`/alunos/[id]`** (a ficha) |
| Link de volta | `/alunos` | `/alunos/[id]` |
| Duplicidade | compara com todos | compara **excluindo o próprio id** |
| Guarda de data | — | §8.4 |

**Sucesso na edição vai para a ficha** porque é de lá que o usuário veio e é lá
que a mudança se prova.

### 8.4 `dataNascimento` — o caso da limpeza impossível

Confirmado em §4.4: não existe payload que grave `NULL`.

**Decisão.** Guarda **no cliente**, antes do `fetch`:

> Se o aluno **tinha** `dataNascimento` e o campo foi submetido **vazio**, não
> enviar a requisição. Exibir sob o campo:
>
> **"Não é possível remover a data de nascimento nesta versão. Corrija a data ou
> mantenha a atual."**

Alternativas descartadas, e por quê:

- **Omitir o campo e seguir** — o servidor devolveria 200 e a data antiga
  continuaria lá. O usuário veria "salvo com sucesso" e a data intacta: o
  sistema mentiria. Inaceitável.
- **Enviar `null`** — 422 com mensagem técnica sobre formato, que não descreve o
  problema real.
- **Bloquear o campo** (`readOnly` quando preenchido) — impediria **corrigir**
  uma data errada, que é o caso comum.

Se o aluno **não tinha** data e o campo continua vazio, a chave é simplesmente
omitida — comportamento normal, sem aviso.

**Registrar como dependência de backend** (§4.4 / `frontend-plan.md` §12, D3):
tornar `dataNascimento` `.nullable()` em `atualizarAlunoSchema` e tratar `null`
no handler. **Não implementar** — é `src/lib/` e `src/app/api/`.

### 8.5 Aluno inativo

Editável normalmente. O formulário não muda. A ficha é quem sinaliza o estado
(`Badge` "Inativo", já existente) e oferece "Reativar" (§9).

### 8.6 Atualização da ficha e da lista

```ts
router.refresh();
router.push(`/alunos/${id}`);
```

Ver §12.4 para a base empírica.

---

## 9. Ativação e inativação

| Item | Decisão |
| --- | --- |
| Forma | **Botão dedicado**, nunca campo do formulário |
| Local | Barra de ações da **ficha** (`/alunos/[id]`) |
| Texto | `"Inativar aluno"` quando `ativo === true`; `"Reativar aluno"` quando `false` |
| Variante | `outline` — é reversível, não é ação perigosa |
| Confirmação | **nenhuma** — reversível em um clique, sem perda de dado |
| Requisição | `PATCH /api/alunos/:id` com `{ ativo: !aluno.ativo }` |
| Durante | botão desabilitado, rótulo muda para `"Inativando…"` / `"Reativando…"` |
| Sucesso | **permanece na ficha** + `router.refresh()` |
| Erro | mensagem em `role="alert"` na própria barra, via `mensagemDoErro(status)`; botão volta a ficar habilitado |

**Por que não é campo do formulário.** Inativar não é editar dado cadastral: é
mudar a visibilidade do aluno na lista (o filtro "Ativos" é o padrão de trabalho
do professor). Embutir isso num formulário exigiria "salvar" para arquivar
alguém, e misturaria uma mudança de estado com uma correção de digitação. Botão
dedicado, efeito imediato.

**Por que sem confirmação.** Confirmação existe para ação irreversível. Esta se
desfaz com um clique no mesmo botão. Pedir confirmação aqui treinaria o usuário a
clicar "sim" sem ler — e é justamente o reflexo que precisa funcionar na
exclusão.

**Impacto real, a declarar na interface:** um aluno inativo **continua no
sistema**, com todas as avaliações e o relatório intactos; some apenas do filtro
"Ativos". Texto de apoio sob o botão, uma linha.

---

## 10. Exclusão

### 10.1 Origem do impacto

`GET /api/alunos/:id` → `aluno.avaliacoes.length`, já disponível na ficha (a
página inclusive já calcula `totalAvaliacoes` para o `AlunoCabecalho`). **Nenhuma
chamada nova.** A API não oferece prévia (§4.5).

### 10.2 Texto exato da confirmação

Título:

> **Excluir {nome do aluno}?**

Descrição, com pluralização obrigatória:

| `totalAvaliacoes` | Texto |
| --- | --- |
| `0` | `"Este aluno não tem avaliações registradas. Esta ação não pode ser desfeita."` |
| `1` | `"Isso também exclui 1 avaliação, com todas as medidas e testes. Esta ação não pode ser desfeita."` |
| `n > 1` | `"Isso também exclui {n} avaliações, com todas as medidas e testes. Esta ação não pode ser desfeita."` |

Botões: **`Excluir aluno`** (perigo) e **`Cancelar`** (secundário).
Cancelar é o **foco inicial** do diálogo.

### 10.3 Comportamento

| Item | Decisão |
| --- | --- |
| Confirmação | obrigatória, via `ConfirmDialog` (§12.3) |
| Requisição | `DELETE /api/alunos/:id` |
| `204` | `apiFetch` **já** devolve sem ler o corpo (`api.ts:31-33`) — não escrever `res.json()` em lugar nenhum |
| Durante | botão de confirmar desabilitado, rótulo `"Excluindo…"`; **diálogo não fecha** |
| Duplo clique | impedido pelo `disabled` + guarda `if (pendente) return` |
| Sucesso | fecha o diálogo → `router.refresh()` → `router.push("/alunos")` |
| Erro | **diálogo permanece aberto**, mensagem em `role="alert"` dentro dele, botão reabilitado |
| Aluno já excluído (404) | mensagem: `"Este aluno já não existe. Atualizando a lista."` e, ainda assim, navegar para `/alunos` — o estado desejado foi alcançado |
| Mutação otimista | **proibida** — nada some da tela antes do 204 |

O caso do 404 importa porque foi medido: o **segundo** `DELETE` do mesmo id
devolve 404 (§4.5). Um duplo clique que escape das guardas não pode virar um erro
assustador.

---

## 11. Nome duplicado

### 11.1 Algoritmo

1. **Fonte:** a página (Server Component) busca `GET /api/alunos` e passa
   `nomesExistentes: { id: string; nome: string }[]` como prop.
2. **Normalização:** `normalizarTexto` de `src/features/alunos/utils.ts` — já
   existente, já usada em Client Component. Trim + NFD + remoção de diacríticos +
   minúsculas. `"José"` e `"jose "` colidem.
3. **Momento:** no **`onBlur`** do campo `nome` e novamente **no submit**.
   Nunca a cada tecla — e, como a lista já está em memória, **nenhuma requisição
   é feita em nenhum dos dois momentos**.
4. **Edição:** filtrar `nomesExistentes` removendo o próprio `id` antes de
   comparar, para o aluno nunca colidir consigo mesmo.
5. **Efeito:** aviso, jamais bloqueio. O submit prossegue.

### 11.2 Mensagem

> **"Já existe um aluno chamado "{nome existente}". Você pode continuar se forem
> pessoas diferentes."**

Usa o nome **como está gravado** (não o normalizado), para o professor
reconhecer quem é.

### 11.3 Por que esta estratégia

| Alternativa | Veredito |
| --- | --- |
| **Lista por prop** (adotada) | Zero requisição extra, zero latência, reutiliza `normalizarTexto`. A lista já é buscada inteira pela `/alunos` hoje — o padrão está estabelecido e o volume é de dezenas de alunos |
| Chamada extra no cliente | Requisição por verificação, estado de carregamento, e nenhuma precisão a mais |
| `GET /alunos?busca=` | O `LIKE` do SQLite é insensível a caixa mas **não a acento** (medido). Perderia "José" × "Jose", que é exatamente o caso que importa |
| Verificar por tecla | Requisição por tecla, explicitamente proibido |

### 11.4 Acessibilidade

O aviso vive num contêiner com `aria-live="polite"` associado ao campo por
`aria-describedby`. **Não** usa `aria-invalid` — não é erro. Não recebe cor como
único sinal (§2.6).

---

## 12. Arquitetura de componentes

### 12.1 Fronteira Server/Client

| Camada | Componente | Motivo |
| --- | --- | --- |
| **Server** | `alunos/novo/page.tsx` | busca `GET /alunos`, compõe |
| **Server** | `alunos/[id]/editar/page.tsx` | busca aluno + lista, trata 404, compõe |
| **Client** | `AlunoForm` | `useActionState`, `onBlur`, foco |
| **Client** | `AcoesAluno` | botões de inativar/excluir com estado |
| **Client** | `ConfirmDialog` | diálogo modal |
| Server | `alunos/page.tsx`, `alunos/[id]/page.tsx` | **permanecem Server** — só ganham a composição das ações |

`"use client"` fica nas **folhas** (`frontend-plan.md` §2.2). Nenhuma página vira
Client Component. As páginas de lista e ficha continuam Server e apenas renderizam
`<AcoesAluno …/>`.

### 12.2 `AlunoForm` — um componente, duas ações

```tsx
<AlunoForm
  modo="criar" | "editar"
  aluno={null | { id, nome, dataNascimento, ativo }}
  nomesExistentes={{ id, nome }[]}
/>
```

Internamente escolhe a ação (`criarAluno` ou `atualizarAluno`) pelo `modo`. **Um
componente** porque a forma é idêntica; **duas ações** porque método, URL,
schema e destino diferem. Parametrizar uma ação única com um `if` no meio faria o
mesmo trabalho com menos clareza.

### 12.3 `ConfirmDialog`

Construído **diretamente sobre `@base-ui/react/alert-dialog`**, já instalado
(Base UI 1.6.0). Partes disponíveis, verificadas: `Root`, `Trigger`, `Portal`,
`Backdrop`, `Popup`, `Title`, `Description`, `Close`, `Viewport`.

`AlertDialog` do Base UI **omite** as props `modal` e `disablePointerDismissal`:
é sempre modal e **não fecha por clique fora** — semântica correta para uma
confirmação destrutiva. Foco preso, `Escape`, devolução do foco ao gatilho e
associação `aria-labelledby`/`aria-describedby` vêm do primitivo.

**Não** adicionar o `alert-dialog` do registro do shadcn: o `--diff` mostra que
ele traz junto um `button.tsx` **sobrescrito**, que apagaria o fallback de foco
do projeto. Escrever o componente à mão, mínimo e próprio.

**Obrigatório:** o popup precisa de **`bg-background`** explícito. O registro usa
`bg-popover`, e `--popover` não existe (§2.6) — o diálogo sairia **transparente
sobre a página**. Adicionar também borda visível (`border` + `border-current` ou
equivalente que não dependa de token ausente).

API:

```tsx
<ConfirmDialog
  aberto={boolean}
  aoMudarAberto={(aberto: boolean) => void}
  titulo={string}
  descricao={string}
  rotuloConfirmar={string}
  aoConfirmar={() => void}
  pendente={boolean}
  erro={string | null}
/>
```

### 12.4 Navegação e atualização — base empírica

Medido no navegador, com navegação client-side real:

| Cenário | Resultado |
| --- | --- |
| Criar aluno via API → navegar client-side para `/alunos` | **o novo aluno aparece**, sem `refresh()` explícito |
| Renomear via API → **voltar/avançar** no histórico | **mostra o nome antigo** — dado velho |

Isso confirma a documentação do Next 16: *"Pages are not cached by default but
are reused during browser back/forward navigation."* Uma navegação **para frente**
já busca dado fresco; o cache de **voltar/avançar** é que guarda a versão antiga.

**Regra da E4**, alinhada com `frontend-plan.md` §5.5:

```ts
router.refresh();   // invalida o cache do cliente
router.push(destino);
```

`router.refresh()` sozinho quando **não há troca de tela** (inativar/reativar).

> Honestidade: a eficácia de `router.refresh()` **especificamente contra o cache
> de voltar/avançar** não foi medida nesta investigação — é o que a documentação
> oficial descreve, e o implementador deve conferir na U5.

**Não** usar `refresh()` de `next/cache`: é para Server Actions, e a E4 usa ações
do cliente com `fetch` para `/api/*`.

---

## 13. Estrutura de arquivos

### 13.1 Criar

| Caminho | Tipo | Conteúdo |
| --- | --- | --- |
| `src/app/alunos/novo/page.tsx` | Server | rota de criação |
| `src/app/alunos/novo/loading.tsx` | Server | esqueleto de **formulário** |
| `src/app/alunos/[id]/editar/page.tsx` | Server | rota de edição |
| `src/app/alunos/[id]/editar/loading.tsx` | Server | esqueleto de **formulário** |
| `src/features/alunos/AlunoForm.tsx` | **Client** | formulário compartilhado |
| `src/features/alunos/AcoesAluno.tsx` | **Client** | editar / inativar / excluir na ficha |
| `src/features/alunos/acoes.ts` | módulo | `criarAluno`, `atualizarAluno`, `alternarAtivo`, `excluirAluno` |
| `src/features/alunos/mappers.ts` | módulo | `formDataParaAluno`, mapeamento de `issues[]` |
| `src/components/ui/campo-formulario.tsx` | Server | `<label>` + campo + erro + `aria-describedby` |
| `src/components/ui/confirm-dialog.tsx` | **Client** | §12.3 |

Os `loading.tsx` próprios existem porque `src/app/alunos/loading.tsx` cobre os
filhos e mostraria o **esqueleto da lista** numa rota de formulário.

**`error.tsx` e `not-found.tsx` novos: nenhum.** Os boundaries de `/alunos` e
`/alunos/[id]` já cobrem as duas rotas novas (§2.2) — `notFound()` em
`/alunos/[id]/editar` resolve para `/alunos/[id]/not-found.tsx`.

### 13.2 Alterar

| Caminho | Alteração |
| --- | --- |
| `src/app/alunos/page.tsx` | botão "Novo aluno" ao lado do `<h1>` |
| `src/app/alunos/[id]/page.tsx` | renderizar `<AcoesAluno />` |
| `src/features/alunos/tipos.ts` | `CampoAluno`, `ValoresAluno`, `EstadoAluno` |
| `src/components/ui/button.tsx` | **+`focus-visible:outline-solid`** (§2.7) |
| `src/components/ui/input.tsx` | **+`focus-visible:outline-solid`** (§2.7) |

As duas últimas são **uma classe cada**. Nenhuma outra mudança nesses arquivos.

### 13.3 Preservar sem tocar

`AlunoCabecalho` · `AlunosTabela` · `BuscaEFiltroAlunos` · `ComparacaoAvaliacoes`
· `HistoricoAvaliacoes` · `TestesAvaliacao` · `utils.ts` · `features/shared/**` ·
`features/relatorio/**` · `src/app/globals.css` · `src/app/layout.tsx` · demais
primitivos de `components/ui/`.

### 13.4 Protegidos — parada obrigatória

`prisma/**` · `src/app/api/**` · `src/lib/**` · `src/generated/**` ·
`package.json` · `package-lock.json` · `components.json` · `eslint.config.mjs` ·
`prisma/dev.db`.

---

## 14. UI e hierarquia visual

### 14.1 Layout do formulário

Coluna única, `max-w-lg`, dentro do mesmo `main` das demais telas
(`mx-auto w-full max-w-4xl px-6 py-12`). Uma coluna em **todas** as larguras:
são dois campos, e duas colunas só criariam movimento ocular sem ganho.

Ordem: link de volta → `<h1>` → resumo de erros (quando houver) → campos →
ações.

### 14.2 Campos

| Item | Regra |
| --- | --- |
| `<label>` | sempre presente, associado por `htmlFor`, **nunca** placeholder no lugar de label |
| Obrigatoriedade | `Nome *` com legenda "* campo obrigatório" acima dos campos; `required` no input |
| Texto de apoio da data | "Opcional. Usada para calcular a idade no relatório." |
| Erro | abaixo do campo, associado por `aria-describedby` |

### 14.3 Ações

| Papel | Botão | Variante | Posição |
| --- | --- | --- | --- |
| Primária | `Salvar aluno` / `Salvar alterações` | `default` | primeira em desktop |
| Secundária | `Cancelar` (link para a origem) | `outline` | ao lado |
| Perigosa | `Excluir aluno` | `destructive` | **separada**, na ficha, nunca colada na primária |

Em **mobile** os botões empilham, primária **em cima**. `flex-col-reverse` +
`sm:flex-row` mantém a ordem do DOM (primária primeiro, boa para teclado) com a
ordem visual desejada — sem `order-*` quebrando a leitura.

### 14.4 Alvos de toque

Mínimo **44 px** de altura efetiva nos botões de ação em mobile. Os tamanhos
padrão de `button.tsx` (`h-8`, 32 px) são pequenos: usar `size="lg"` (`h-9`) com
`py` adicional, ou classe utilitária local, para chegar ao alvo. O material do
cliente são fotos de planilha em tablet (`planilha-atual.md`) — o dedo é o
dispositivo real.

### 14.5 Tokens ausentes

Repetindo §2.6 como regra operacional: `text-destructive` **não pinta nada**.
Erro nunca é comunicado só por cor. Usar peso de fonte, prefixo textual e
`aria-invalid`. **Não** inventar tokens novos, nem escrever cores literais para
compensar.

### 14.6 Sem polimento final

A E8 é a etapa de acabamento. A E4 entrega estrutura correta, acessível e
responsiva — não hierarquia visual refinada nem microinterações.

---

## 15. Acessibilidade

| Item | Exigência |
| --- | --- |
| Labels | todo campo com `<label htmlFor>`; nenhum campo rotulado só por placeholder |
| Descrições | texto de apoio e aviso de duplicidade ligados por `aria-describedby` |
| Obrigatório | `required` no input + marcação textual no label |
| `aria-invalid` | `true` **apenas** quando o campo tem erro; nunca no aviso de duplicidade |
| `aria-describedby` | aponta para apoio **e** erro quando ambos existirem (lista de ids) |
| Resumo de erros | `role="alert"` no topo, só com >1 erro ou erro geral |
| `aria-live` | `polite` no aviso de duplicidade; `alert` (assertivo) para erro de submissão |
| Foco no primeiro erro | após submissão falha, na ordem do DOM; reexecuta a cada tentativa (§5.6) |
| Foco no diálogo | preso enquanto aberto; **`Cancelar` recebe o foco inicial** |
| Retorno de foco | ao fechar, volta ao botão que abriu — garantido pelo Base UI |
| `Escape` | fecha o diálogo; **não** fecha durante `pendente` |
| Pending | botão `disabled` + rótulo textual mudando ("Salvando…"), não só spinner |
| Contraste | conferir em claro e escuro; sem tokens, o texto herda `--foreground`, que contrasta |
| Foco visível | **garantido pela correção de §2.7** — é pré-requisito, não polimento |
| Teclado | criar, editar, inativar e excluir completáveis sem mouse |
| Zoom 200% | conferir em 1280 px com zoom 200% (640 px efetivos): sem rolagem horizontal |

---

## 16. Segurança e integridade

- **Nunca confiar só no cliente.** O Zod do cliente é conveniência; o 422 do
  servidor é sempre tratado e exibido.
- **Nunca enviar campos inesperados.** Enviar exatamente `resultado.data` do
  `safeParse`. O servidor descarta extras silenciosamente (§4.1) — não é motivo
  para mandar lixo.
- **Nunca exibir o `error` cru da API.** Traduzir por status
  (`features/shared/erros.ts`). Exceção única: `issues[].message`.
- **`DELETE` sempre explícito**, sempre confirmado, nunca por atalho de teclado
  ou clique único.
- **Nunca `res.json()` num 204.** `apiFetch` já protege; não contornar.
- **Sem mutação otimista na exclusão.** Nada some da tela antes do 204.
- **Duplo submit** impedido em duas camadas: `disabled` durante `pendente` **e**
  guarda no início da ação.
- **Testes não tocam o seed.** Só alunos temporários com prefixo próprio (§18).
- **Sem dado pessoal em log.** Nada de `console.log` de nome ou data de
  nascimento no código entregue.

---

## 17. Casos de borda

| # | Caso | Comportamento esperado |
| --- | --- | --- |
| 1 | `nome` com 1 caractere | barrado no cliente (`minLength` + Zod); se forçado, 422 sob o campo |
| 2 | `nome` vazio | idem, mensagem `"Nome precisa de pelo menos 2 letras"` |
| 3 | `nome` só com espaços | trim → vazio → mesma mensagem |
| 4 | `nome` com espaços nas pontas | aceito, **gravado aparado** |
| 5 | `nome` duplicado | aviso não-bloqueante; criação **prossegue** e devolve 201 |
| 6 | homônimo legítimo | usuário ignora o aviso e salva; sem obstáculo |
| 7 | data válida | aceita; idade aparece na ficha |
| 8 | data inválida (`1990-02-31`, `20/05/1990`) | barrada; mensagem `"Informe uma data válida."` |
| 9 | data ausente na criação | chave omitida do payload; 201; ficha sem linha "Idade" |
| 10 | **tentativa de limpar data na edição** | submit bloqueado com a mensagem de §8.4 |
| 11 | aluno ativo → inativar | `Badge` vira "Inativo"; some do filtro "Ativos" |
| 12 | aluno inativo → reativar | volta ao filtro "Ativos" |
| 13 | edição sem nenhuma mudança | `PATCH` com os mesmos valores → 200; navega para a ficha |
| 14 | id malformado em `/editar` | 404 → `not-found.tsx` de `/alunos/[id]` |
| 15 | UUID inexistente em `/editar` | idem |
| 16 | 422 com **um** campo | mensagem sob o campo; **sem** resumo no topo; foco no campo |
| 17 | 422 com **vários** campos | resumo `role="alert"` no topo + mensagem em cada campo; foco no primeiro |
| 18 | 409 | inalcançável nesta rota (§4.1); mapear mesmo assim para `mensagemDoErro(409)` |
| 19 | 500 | erro geral `"Ocorreu um erro interno. Tente novamente."`; valores preservados |
| 20 | rede fora do ar | `status: 0` → `"Não foi possível conectar ao servidor…"`; valores preservados |
| 21 | duplo clique em Salvar | segunda chamada não sai (`disabled` + guarda) |
| 22 | exclusão com **0** avaliações | texto sem contagem (§10.2) |
| 23 | exclusão com **1** avaliação | `"1 avaliação"`, singular |
| 24 | exclusão com **n** avaliações | `"{n} avaliações"`, plural |
| 25 | cancelar exclusão | diálogo fecha, **nada acontece**, foco volta ao botão |
| 26 | aluno já excluído em outra aba | `DELETE` → 404 → mensagem de §10.3 + navega para `/alunos` |
| 27 | `PATCH` com payload vazio | 200 (§4.3) — não é erro, mas o formulário sempre envia `nome`, então não ocorre |

---

## 18. Estratégia de testes

### 18.1 Regra inviolável de dados

- **Nunca** alterar ou excluir **Ana Prado**, **Bruno Tavares** ou
  **Carla Menezes**, nem suas avaliações.
- Todo registro de teste usa o prefixo **`ZZTESTE-E4-`** no nome.
- **Registrar os ids criados** conforme forem criados.
- **Excluir todos** ao final de cada unidade.
- **Proibido** `npm run db:seed`, `db:reset`, `db:migrate`.
- Ao encerrar: `GET /api/alunos` deve devolver **exatamente 3 alunos**, com
  `totalAvaliacoes` **8 / 5 / 3** e `ativo: true` nos três.

Estado de referência, medido no início e no fim desta investigação:

| Nome | `dataNascimento` | `ativo` | `totalAvaliacoes` |
| --- | --- | --- | --- |
| Ana Prado | 1998-03-14 | true | 8 |
| Bruno Tavares | 2001-11-02 | true | 5 |
| Carla Menezes | 1995-07-21 | true | 3 |

### 18.2 Roteiro funcional

1. **Criar** `ZZTESTE-E4-alfa` sem data → 201 → cai em `/alunos` **com o aluno
   visível**.
2. **Criar** `ZZTESTE-E4-beta` com data → idade aparece na ficha.
3. **Criar** com nome de 1 letra → barrado no cliente; forçar via DevTools →
   422 sob o campo.
4. **Criar** `ZZTESTE-E4-alfa` de novo → aviso de duplicidade → salvar mesmo
   assim → 201.
5. **Editar** `alfa`: mudar nome → ficha mostra o nome novo.
6. **Editar** `beta`: apagar a data → **submit bloqueado** com a mensagem de §8.4.
7. **Editar** `beta`: corrigir a data para outra válida → 200.
8. **Inativar** `alfa` → `Badge` "Inativo" → some do filtro "Ativos".
9. **Reativar** `alfa` → volta.
10. **Excluir** `alfa` (0 avaliações) → texto sem contagem → 204 → `/alunos`.
11. Criar `ZZTESTE-E4-gama`, adicionar **1** avaliação por `POST /api/avaliacoes`
    → excluir → texto no **singular** → confirmar que a avaliação some (404).
12. Criar `ZZTESTE-E4-delta` com **3** avaliações → excluir → **plural** →
    cascata confirmada.
13. **Cancelar** uma exclusão → nada acontece, foco volta.
14. **Duplo clique** em Salvar e em Excluir → uma requisição só (conferir no log
    do servidor).
15. **Limpar** todos os temporários; conferir o estado de §18.1.

### 18.3 Ambientes e ferramentas

- `npm run dev` para o ciclo; `npm run build` + `npm start` para uma passada
  final de produção.
- Navegador (Chrome/Edge) para teclado, foco, diálogo e responsividade.
- `curl` ou script Node para forçar 422/404/500 e conferir contratos.
- Larguras **360 / 768 / 1280** px, e **zoom 200 %**.
- Teclado: percorrer criar → editar → inativar → excluir **sem mouse**.

### 18.4 Artefatos

Scripts, logs e screenshots de teste **não são versionados**. Gerar fora da
árvore do projeto ou apagar antes do commit. **Não** alterar `.gitignore`.

---

## 19. Critérios de aceite

### Formulário

- [ ] `nome` com 1 letra é **barrado no cliente**; forçado, exibe a mensagem do
      422 **sob o campo**.
- [ ] Um 422 forçado marca **exatamente** o campo de `issues[].field`.
- [ ] 422 com vários campos: resumo no topo + mensagem em cada campo + foco no
      primeiro.
- [ ] Valores digitados **sobrevivem** a um erro de submissão.
- [ ] `pending` desabilita o submit e muda o rótulo.
- [ ] Duplo clique **não** produz duas requisições.
- [ ] Nome duplicado **avisa sem bloquear**; salvar prossegue.
- [ ] Na edição, o aluno **não colide consigo mesmo**.
- [ ] Nenhuma requisição disparada por tecla.

### Fluxos

- [ ] Criar → `/alunos` **com o aluno já visível**.
- [ ] Editar → ficha **com o dado atualizado**.
- [ ] Inativar/reativar → **permanece na ficha**, `Badge` e filtro refletem.
- [ ] Excluir → `/alunos`, aluno ausente, contador correto.
- [ ] Confirmação de exclusão **cita a quantidade de avaliações**, com plural
      correto para 0, 1 e n.
- [ ] Cancelar exclusão não altera nada.
- [ ] `204` tratado **sem leitura de corpo**.
- [ ] Aluno inexistente em `/editar` → `not-found` existente.

### Acessibilidade

- [ ] **Foco visível** em botões, inputs, links e controles do diálogo.
- [ ] Fluxo completo por teclado, sem mouse.
- [ ] `Escape` fecha o diálogo; foco volta ao gatilho.
- [ ] Erros anunciados; foco no primeiro campo inválido.
- [ ] Nenhuma informação transmitida **só** por cor.
- [ ] Sem rolagem horizontal em 360 px e em zoom 200 %.

### Integridade

- [ ] Os 3 alunos do seed intactos: 8 / 5 / 3 avaliações, todos ativos.
- [ ] Nenhum registro `ZZTESTE-` no banco ao final.
- [ ] Nenhum arquivo de `prisma/`, `src/app/api/` ou `src/lib/` alterado.
- [ ] Nenhuma dependência adicionada; `package.json` intacto.

### Automático

- [ ] `npm run typecheck` sem erro.
- [ ] `npm run lint` sem erro nem aviso novo.
- [ ] `npm run build` conclui; `/alunos/novo` e `/alunos/[id]/editar` aparecem
      como `ƒ`.

---

## 20. Plano de execução

Cinco unidades, numa única sessão, sem aprovação entre elas.

### U1 — Foco, tipos e infraestrutura de ação

**Objetivo.** Base pronta, sem nenhuma tela nova.
**Arquivos.** Alterar `button.tsx` e `input.tsx` (uma classe cada, §2.7); alterar
`features/alunos/tipos.ts`; criar `mappers.ts`, `acoes.ts`,
`components/ui/campo-formulario.tsx`.
**Validação.** `typecheck`, `lint`, `build`; percorrer `/alunos` com `Tab` e
confirmar **foco visível** em input e botões (era o defeito de §2.7).

### U2 — Formulário compartilhado e criação

**Objetivo.** `/alunos/novo` funcionando ponta a ponta.
**Arquivos.** Criar `AlunoForm.tsx`, `alunos/novo/page.tsx`,
`alunos/novo/loading.tsx`; alterar `alunos/page.tsx` (botão "Novo aluno").
**Validação.** Roteiro §18.2 itens 1–3; 422 forçado; valores preservados.

### U3 — Edição e estado ativo

**Objetivo.** `/alunos/[id]/editar` e o botão de inativar.
**Arquivos.** Criar `alunos/[id]/editar/page.tsx` + `loading.tsx`,
`AcoesAluno.tsx`; alterar `alunos/[id]/page.tsx`.
**Validação.** Itens 5–9; guarda de `dataNascimento` (§8.4); `notFound` em id
inválido; confirmar que a ficha mostra o dado novo.

### U4 — Confirmação e exclusão

**Objetivo.** `ConfirmDialog` e exclusão com impacto.
**Arquivos.** Criar `components/ui/confirm-dialog.tsx`; ampliar `AcoesAluno.tsx`.
**Validação.** Itens 10–13; pluralização; `Escape`; foco inicial em Cancelar;
retorno de foco; cascata confirmada; **fundo do diálogo visível** (§12.3).

### U5 — Bordas, duplicidade, acessibilidade e responsividade

**Objetivo.** Fechar a etapa.
**Arquivos.** Ajustes pontuais onde os testes apontarem.
**Validação.** Tabela inteira de §17; aviso de duplicidade (§11); checklist de
§19; 360/768/1280 e zoom 200 %; teclado completo; limpeza e conferência do seed
(§18.1); `typecheck`, `lint`, `build` finais.

---

## 21. Estratégia de commits

Um commit por bloco coeso. Conventional Commits, **mensagem em inglês** (padrão
do repositório). **Sem aprovação humana entre commits.** Sem `push`, `merge`,
`rebase` ou troca de branch. **Sem metadados de IA** (`Co-Authored-By`,
`Claude-Session` ou equivalentes).

| # | Mensagem | Unidade |
| --- | --- | --- |
| 1 | `fix(ui): restore visible focus ring on button and input` | U1 |
| 2 | `feat(alunos): add form field, action state and mappers` | U1 |
| 3 | `feat(alunos): add student creation form and route` | U2 |
| 4 | `feat(alunos): add student edit route and active state toggle` | U3 |
| 5 | `feat(alunos): add delete confirmation with impact summary` | U4 |
| 6 | `fix(alunos): cover form edge cases and accessibility` | U5 |

O commit 1 fica **separado** de propósito: é correção de primitivo compartilhado
que afeta o app inteiro, não parte da feature de aluno — merece história própria.

Rodar `typecheck` e `lint` antes de cada commit; `build` em todas as unidades.
Commitar **apenas** arquivos do projeto — nenhum script, log ou screenshot.

---

## 22. Autonomia do implementador

### Pode decidir sozinho, sem perguntar

Nomes de variáveis, funções e componentes locais · organização interna dos
arquivos · classes Tailwind, espaçamentos e tamanhos dentro das regras de §14 ·
composição e divisão de subcomponentes · textos auxiliares de interface em
português **que a spec não fixou** · melhorias de acessibilidade além do exigido
· refactors locais nos arquivos que já está tocando · divisão exata dos commits ·
execução de qualquer comando não destrutivo · criação de alunos temporários
`ZZTESTE-E4-` e de avaliações temporárias para eles · edição e exclusão desses
temporários · alterações temporárias reversíveis no código para forçar um caso ·
correção de erros locais de `typecheck`/`lint`/`build` · `git add` e
`git commit`.

### Textos que a spec **fixou** e não devem ser reescritos

Mensagem de limpeza de data (§8.4) · textos da confirmação de exclusão (§10.2) ·
mensagem de nome duplicado (§11.2) · rótulos de inativar/reativar (§9).

---

## 23. Paradas obrigatórias

Parar, descrever o achado com evidência (caminho:linha ou saída de comando),
propor alternativas e **aguardar decisão** — nunca contornar por conta própria:

1. Necessidade de alterar `prisma/**`, `src/app/api/**` ou `src/lib/**`.
2. Necessidade de alterar o schema do Prisma.
3. Necessidade de **dependência nova** — incluindo React Hook Form, Formik,
   qualquer biblioteca de formulário, store global ou biblioteca de diálogo.
4. Contrato real incompatível com §4.
5. Impossibilidade comprovada de cumprir um requisito de §19.
6. Mudança de arquitetura (Server/Client, consumo da API, Server Actions,
   feature-first).
7. Risco de perda de dado real — qualquer coisa que toque os 3 alunos do seed ou
   suas avaliações.
8. Comando destrutivo irreversível (`db:reset`, `db:seed`, `git reset --hard`,
   `git clean -fd`, `rm -rf`, `checkout --` sobre trabalho não commitado).
9. Necessidade de `push`, `merge` ou `rebase`.
10. Necessidade de resolver **globalmente** os tokens da Nova.
11. Requisito de produto indispensável que esta spec **não** decidiu.

---

## 24. Protocolo final

1. Ler esta spec inteira antes de escrever qualquer linha.
2. Reler `docs/frontend-plan.md` (§2.1–2.3, §4.7, §5.5, §6, §7) e `docs/api.md`.
3. **Não criar um plano novo.** A spec é o plano.
4. Implementar U1 → U5, na ordem.
5. `typecheck` e `lint` ao fim de cada unidade; `build` em todas.
6. Testar no navegador, não só no código.
7. Limpar os dados temporários e conferir o seed (§18.1) antes de cada commit.
8. Commitar por unidade. **Sem `push`. Sem `merge`. Não avançar para a E5.**
9. Entregar relatório final com: resumo · funcionalidades · arquivos
   criados/alterados · commits com hash e responsabilidade · resultados de
   `typecheck`/`lint`/`build` · testes executados **e os não executados** ·
   casos de borda de §17 com resultado · ids temporários criados **e confirmação
   de limpeza** · estado final do seed · decisões tomadas dentro da autonomia ·
   divergências encontradas · pendências · limitações não validadas ·
   `git status` final.

**Honestidade de relatório:** o que não foi verificado deve ser declarado como
não verificado. Não afirmar confirmação visual sem tê-la feito.

---

## 25. Pendências registradas (não resolver na E4)

| # | Pendência | Origem |
| --- | --- | --- |
| P1 | Tokens da Nova ausentes — sem hierarquia visual, `text-destructive` inerte | `frontend-plan.md` §0.4 |
| P2 | `globals.css:25` sobrescreve a fonte Geist com Arial | `frontend-plan.md` §4.10 |
| P3 | **D3 confirmada**: `PATCH` não limpa `dataNascimento`. Pedido ao backend: `.nullable()` no schema + tratamento no handler | §4.4 |
| P4 | D5: `POST`/`PATCH /alunos` não devolvem `totalAvaliacoes` | §4.1 |
| P5 | Regra ESLint `no-restricted-imports` de §7.4 do plano nunca implementada | §2.8 |
| P6 | Gráficos do relatório (E3 reduzida) continuam pendentes | `e3-implementation-spec.md` §1.5 |
| P7 | Registro do shadcn traz `button.tsx` divergente do projeto — `shadcn add` sobrescreveria o fallback de foco | §12.3 |
