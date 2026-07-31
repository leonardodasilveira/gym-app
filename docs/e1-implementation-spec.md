# E1 — Especificação de implementação

**Contrato operacional** da etapa E1: `/alunos/[id]`, a ficha individual do aluno.

Escrito em **31/07/2026**, a partir do código real e de verificação empírica dos
endpoints. Destina-se a ser implementado sem consultas intermediárias — as
lacunas já foram decididas aqui.

Convenções deste documento:

| Marca | Significado |
| --- | --- |
| **[FATO]** | confirmado no código ou por requisição real, com caminho/linha |
| **[DECISÃO]** | escolha feita aqui; implementar como está, sem rediscutir |
| **[SUPOSIÇÃO]** | não confirmado; assumido pelo menor risco |
| **[RISCO]** | pode dar errado; mitigação indicada |
| **[BLOQUEIO]** | exige intervenção humana antes de prosseguir |

Hierarquia de autoridade: `docs/api.md` manda no contrato → `docs/frontend-plan.md`
manda na arquitetura → este documento manda na E1. Divergência entre eles é
**[BLOQUEIO]** (ver §15).

---

## 1. Resumo da etapa

### Objetivo

Entregar `/alunos/[id]`: dados gerais do aluno, histórico de avaliações com as
siglas da planilha do professor, e comparação entre a avaliação mais recente e a
anterior.

### Valor de produto

É a segunda tela de leitura e a primeira em que o professor reconhece **o
vocabulário dele** (`TOR DIR`, `SLB ESQ`, `CMJ`). Serve para validar, antes de
qualquer formulário, se a leitura do histórico faz sentido para quem hoje usa a
planilha. Também é a ponte natural para a E2 (relatório).

### Escopo

- Navegação da listagem para a ficha.
- Rota `/alunos/[id]` com `loading`, `error` e `not-found` próprios.
- Cabeçalho com nome, status, idade, total de avaliações e data da mais recente.
- Histórico de avaliações em tabela, uma linha por avaliação, colunas com as siglas.
- Comparação atual × anterior por medida, com variação.
- Testes e tentativas da avaliação mais recente.
- Todos os estados: sem avaliações, sem data de nascimento, avaliação parcial,
  valor nulo, valor zero real, primeira avaliação sem comparação, aluno
  inexistente, erro de API, carregamento, responsividade e acessibilidade.

### Fora de escopo

Cadastro, edição, exclusão, formulário de avaliação, relatório, gráficos,
autenticação, filiais, compartilhamento, paginação, ordenação configurável,
qualquer coisa de E2 em diante.

---

## 2. Fontes de verdade

### Rotas da API consumidas

| Arquivo | Papel |
| --- | --- |
| `src/app/api/alunos/[id]/route.ts:8` | `GET /api/alunos/:id` |
| `src/app/api/avaliacoes/route.ts:14` | `GET /api/avaliacoes?alunoId=&limite=` |

### Contratos e tipos do backend

| Arquivo | O que fornece |
| --- | --- |
| `src/lib/medidas.ts` | `MEDIDAS`, `siglaComLado`, `SUFIXO_LADO`, `DefinicaoMedida`, `ChaveMedida`, `Lado` |
| `src/lib/avaliacoes.ts:158` | `serializarAvaliacao` — origem do tipo de resposta da avaliação |
| `src/lib/schemas.ts:101` | `MedidasDTO` |
| `src/lib/schemas.ts:93` | `listarAvaliacoesQuerySchema` — regras de `alunoId` e `limite` |
| `src/lib/http.ts:45-77` | tradução de erros e formato do 422 |

### Documentação

`docs/api.md` (contrato) · `docs/frontend-plan.md` (arquitetura, §0.4 pendência de
tema, §5 dados, §7 tipagem, §10 convenções) · `docs/planilha-atual.md` (siglas,
"zero significando não medido" em `:139-141`).

### Frontend existente a reutilizar

`src/features/shared/api.ts` · `src/features/shared/erros.ts` ·
`src/features/alunos/tipos.ts` · `src/features/alunos/AlunosTabela.tsx` ·
`src/app/alunos/page.tsx` (fonte do `origemAtual` a extrair) ·
`src/components/ui/{table,badge,card,skeleton,button,empty-state,error-state}.tsx`

---

## 3. Contratos reais

Tudo abaixo foi **verificado por requisição real em 31/07/2026**, não lido da doc.

### 3.1 `GET /api/alunos/:id`

**[FATO]** Resposta 200:

```jsonc
{
  "id": "8b4dfdff-...",
  "nome": "Ana Prado",
  "dataNascimento": "1998-03-14",   // string "AAAA-MM-DD" | null
  "ativo": true,
  "avaliacoes": [                    // TODAS, sem limite (route.ts:13-19 não tem `take`)
    { "id": "...", "dataAvaliacao": "2026-04-30", "observacoes": "..." }  // observacoes: string | null
  ]
}
```

- **[FATO]** `avaliacoes` vem ordenado **decrescente** por `dataAvaliacao`
  (`route.ts:15`), e traz **apenas** `id`, `dataAvaliacao`, `observacoes`
  (`select` em `route.ts:16`).
- **[FATO]** **Não existe `totalAvaliacoes`** neste endpoint (existe só em
  `GET /alunos`, `src/app/api/alunos/route.ts:26`).
- **[FATO]** Não traz medidas nem testes.

### 3.2 `GET /api/avaliacoes?alunoId=<uuid>&limite=<n>`

**[FATO]** Resposta 200: array de avaliações completas, **decrescente** por
`dataAvaliacao` (`route.ts:19`):

```jsonc
{
  "id": "...", "alunoId": "...", "dataAvaliacao": "2026-04-30",
  "medidas": {
    "mobilidadeTornozelo":    { "unidade": "cm", "direito": 12.4, "esquerdo": 13.1 },
    "mobilidadeQuadril":      { "unidade": "cm", "direito": 19.9, "esquerdo": 19.2 },
    "amplitudeIsquiotibiais": { "unidade": "cm", "direito": 22.7, "esquerdo": 22.4 },
    "slb":                    { "unidade": "cm", "direito": 35.1, "esquerdo": 34.5 },
    "cmj":                    { "unidade": "cm", "valor": 43.53 }
  },
  "testes": [
    { "codigo": "SALTO_AGACHADO", "nome": "SJ", "tentativas": [
      { "ordem": 1, "repeticoes": 2,
        "carga": { "valor": 20, "unidade": "kg" },
        "tempo": { "valor": 1.32, "unidade": "s" } }
    ]}
  ],
  "observacoes": "Avaliacao de exemplo.",   // string | null
  "criadoEm": "2026-07-31T14:19:31.402Z",   // ISO datetime
  "alunoNome": "Ana Prado"
}
```

- **[FATO]** As 5 chaves de `medidas` estão **sempre presentes**; os valores
  (`direito`/`esquerdo`/`valor`) são `number | null` (`src/lib/avaliacoes.ts:51-66`).
- **[FATO]** `testes` pode ser `[]`. `tentativas` de um teste presente tem ≥1 item.
- **[FATO]** `testes` vem ordenado por `ordem` asc, e `tentativas` idem
  (`src/lib/avaliacoes.ts:180-186`).
- **[FATO]** `limite`: inteiro, mín. 1, **máx. 200**, default 50
  (`src/lib/schemas.ts:95`).

### 3.3 Comportamento de erro — verificado empiricamente

| Cenário | `GET /alunos/:id` | `GET /avaliacoes?alunoId=` |
| --- | --- | --- |
| UUID válido, existente | 200 | 200 com lista |
| UUID válido, inexistente | **404** `{"error":"Aluno nao encontrado"}` | **200 `[]`** |
| id **não-UUID** (`abc`) | **404** | **422** `{"error":"Dados invalidos","issues":[{"field":"alunoId","message":"Invalid UUID"}]}` |

**[FATO] Esta assimetria é a regra mais importante da §8.** O endpoint de
avaliações rejeita id malformado com 422, enquanto o de aluno responde 404 — a
ordem em que os dois resultados são avaliados determina se o usuário vê "aluno
não encontrado" (correto) ou uma tela de erro genérica (errado).

### 3.4 Ausências confirmadas

**[FATO]** Não existe: paginação (nem `offset`/`cursor`), ordenação configurável,
endpoint de comparação entre avaliações, `totalAvaliacoes` em `/alunos/:id`,
filtro por período em `/avaliacoes`, nem endpoint de atualização de avaliação.
**Não inventar nenhum destes.**

---

## 4. Regras de apresentação

Todas obrigatórias e sem margem de interpretação.

### 4.1 Datas

**[FATO][RISCO R5 do plano]** `dataAvaliacao` e `dataNascimento` são strings
`"AAAA-MM-DD"`. `new Date("2026-04-30")` é meia-noite **UTC** → exibido em
`America/Sao_Paulo` vira **29/04**.

**[DECISÃO]** Formatar quebrando a string, nunca via `Date` a partir do ISO curto:
separar em ano/mês/dia por `split("-")` e montar `DD/MM/AAAA`. Se um `Date` for
necessário para aritmética, construir com componentes locais
(`new Date(ano, mes - 1, dia)`), nunca com a string.

- Formato de exibição: **`30/04/2026`**.
- `criadoEm` (ISO datetime completo) **não é exibido** nesta etapa.

### 4.2 Idade

**[DECISÃO]** Calculada de `dataNascimento` até hoje, em anos completos: diferença
de anos, subtraindo 1 se o mês/dia de aniversário ainda não ocorreu no ano
corrente. Ambas as datas manipuladas por componentes locais (§4.1).

- Exibição: `28 anos`. Para exatamente 1: `1 ano`.
- **`dataNascimento === null`** → **não renderizar o campo idade**. Não exibir
  "—" nem "idade desconhecida"; simplesmente omitir a linha.
- **[RISCO]** Depende do relógio do servidor (a página é Server Component). Aceito.

### 4.3 Nulo × zero — regra inviolável

**[FATO]** `docs/planilha-atual.md:139-141` registra "zero significando não medido"
como bug herdado da planilha, que o sistema existe para eliminar.

**[DECISÃO]**

| Valor | Exibição |
| --- | --- |
| `null` | **`—`** (travessão), com `title`/`aria-label` "não medido" |
| `0` | **`0`** — número real, formatado normalmente |
| qualquer outro número | número formatado (§4.4) |

**Nunca** usar `valor || "—"`, `!valor`, `valor ? ... : ...` ou qualquer teste
que trate `0` como ausente. A verificação obrigatória é `valor === null`
(ou `valor == null` se `undefined` for possível).

### 4.4 Números

**[DECISÃO]** `Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })`.
Resultado: `21` → `21`; `32.5` → `32,5`; `43.53` → `43,53`. Sem casas decimais
mínimas forçadas.

### 4.5 Unidades

**[FATO]** Todas as medidas têm `unidade: "cm"` (literal fechado em
`src/lib/schemas.ts:14`). Carga é `"kg"`, tempo é `"s"`.

**[DECISÃO]** A unidade vai no **cabeçalho da coluna**, nunca repetida em cada
célula: `TOR DIR (cm)`, `Carga (kg)`, `Tempo (s)`. A fonte da unidade nos
cabeçalhos de medida é o catálogo (`MEDIDAS[].unidade`), que é estático e sempre
presente; para carga/tempo, é literal no cabeçalho.

### 4.6 Medidas bilaterais e simples

**[FATO]** `MEDIDAS` (`src/lib/medidas.ts:28`), **nesta ordem**:

| chave | sigla | nome | bilateral |
| --- | --- | --- | --- |
| `mobilidadeTornozelo` | `TOR` | Mobilidade de tornozelo | sim |
| `mobilidadeQuadril` | `QUA` | Mobilidade de quadril | sim |
| `amplitudeIsquiotibiais` | `IQT` | Amplitude de isquiotibiais | sim |
| `slb` | `SLB` | SLB | sim |
| `cmj` | `CMJ` | Counter Movement Jump | não |

**[DECISÃO]** Sempre derivar colunas/linhas **iterando `MEDIDAS` na ordem do
array** — nunca escrever a lista à mão. Regra:

- `bilateral: true` → **duas** colunas/linhas, rotuladas com
  `siglaComLado(sigla, "direito")` e `siglaComLado(sigla, "esquerdo")` →
  `TOR DIR`, `TOR ESQ`. Valores em `medidas[chave].direito` / `.esquerdo`.
- `bilateral: false` → **uma** coluna/linha, rotulada com `sigla` → `CMJ`.
  Valor em `medidas[chave].valor`.

**[DECISÃO]** A sigla é o rótulo visível (é o vocabulário do professor). O `nome`
por extenso vai em `title`/`abbr` para quem não conhece a sigla.
**[FATO]** `SLB` não tem nome por extenso conhecido (dúvida 12 de
`planilha-atual.md`); seu `nome` no catálogo é literalmente `"SLB"` — não inventar
tradução.

### 4.7 Tentativas

**[DECISÃO]** Exibidas **somente para a avaliação mais recente**, em seção
própria, uma tabela por teste (`nome` do teste como subtítulo), colunas:
`Ordem`, `Repetições`, `Carga (kg)`, `Tempo (s)`. Valores crus, formatados por §4.4.

- `testes: []` → seção mostra estado vazio curto ("Nenhum teste registrado nesta
  avaliação"), sem sumir com a seção inteira.

### 4.8 Primeira avaliação e ausência de comparação

**[DECISÃO]**

- Aluno com **1 avaliação**: seção de comparação **não é renderizada**. No lugar,
  um aviso curto: "Esta é a primeira avaliação — ainda não há comparação."
- Aluno com **0 avaliações**: nem histórico nem comparação nem testes. Apenas o
  cabeçalho e um `EmptyState` (§5.4).
- Medida com valor ausente em **qualquer um dos dois lados** da comparação →
  linha presente, variação exibida como `—` (§4.9).

### 4.9 Variação (delta)

**[DECISÃO]** Calcular **apenas** quando `atual !== null && anterior !== null`
(ambos números, incluindo zero). Em qualquer outro caso, variação é `—`.

- `delta = atual - anterior`, **arredondado a 2 casas** para eliminar ruído de
  ponto flutuante (ex.: `32.5 - 31.9 = 0.6000000000000014` → `0,6`).
- Exibição com sinal explícito:
  `Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, signDisplay: "exceptZero" })`
  → `+0,6` · `-0,3` · `0`.
- `delta === 0` → exibir `0` e, para leitor de tela, "sem variação".

**[DECISÃO CRÍTICA] Não colorir a variação como boa ou ruim, e não usar setas de
melhora/piora.** Justificativa: ninguém confirmou a direção desejável de `TOR`,
`QUA`, `IQT`; e `SLB` sequer foi decifrado (`planilha-atual.md`, dúvida 12).
Atribuir semântica de "melhorou/piorou" seria **inventar regra de domínio**, o
que o frontend não pode fazer (`frontend-plan.md:154`). A variação é um número
neutro com sinal. Reavaliar quando o professor confirmar a direção de cada medida.

### 4.10 Cálculos permitidos × proibidos

**Permitidos (apresentação pura, autorizados por `frontend-plan.md:155`):**
subtração entre dois valores já exibidos (§4.9); idade a partir de
`dataNascimento`; contagem de itens de uma lista já recebida; formatação.

**[BLOQUEIO se necessário] Proibidos no frontend** — pertencem ao backend
(`src/lib/calculos.ts`, declaradamente provisório):

velocidade em m/s a partir de tempo/repetições · curva força-velocidade ·
`V0` · `F0` · `Pmáx` · carga ótima · `r²` · inclinação · classificação de perfil ·
score de performance · 1RM estimado · qualquer média, mediana, tendência ou
projeção sobre o histórico · recalcular total de avaliações a partir da lista
limitada (§8.3).

Se a implementação parecer precisar de qualquer um destes, **parar** — é sinal de
escopo indevido.

---

## 5. Arquitetura da página

### 5.1 Seções, na ordem

1. **Navegação de retorno** — link "← Alunos" para `/alunos`, antes do `<h1>`.
2. **Cabeçalho** (`<h1>` = nome do aluno) + `Badge` de status (Ativo/Inativo).
3. **Resumo** — cartão com: idade (se houver), total de avaliações, data da
   avaliação mais recente. Omitir individualmente os campos sem dado.
4. **Comparação: atual × anterior** — apenas se houver ≥2 avaliações.
5. **Histórico de avaliações** — tabela, uma linha por avaliação.
6. **Testes da avaliação mais recente** — apenas se houver ≥1 avaliação.

**[DECISÃO]** Comparação **antes** do histórico: é a informação de maior valor
para o professor, e o histórico é longo e rolável.

### 5.2 Ações visíveis

Somente o link de retorno para `/alunos`. **Nenhum botão de editar, excluir,
nova avaliação ou relatório** — todos pertencem a etapas futuras. Não criar
botões desabilitados nem placeholders "em breve".

### 5.3 Layout responsivo

- Contêiner igual ao da listagem para consistência: `mx-auto w-full max-w-4xl px-6 py-12`.
- **Histórico** tem 10 colunas — rolagem horizontal **dentro do próprio contêiner
  da tabela**, nunca na página. O componente `Table`
  (`src/components/ui/table.tsx`) já embrulha em `overflow-x-auto`; usá-lo como está.
- Tabela de comparação (4 colunas) cabe em telas estreitas sem rolagem.
- Cartão de resumo: coluna única em mobile, linha em telas ≥ `sm`.
- Nenhum scroll horizontal no `<body>` em 360 px.

### 5.4 Estados

| Estado | Comportamento |
| --- | --- |
| **Carregando** | `loading.tsx` do segmento, esqueleto espelhando as seções reais |
| **Aluno inexistente** (404) | `notFound()` → `not-found.tsx` do segmento, com link para `/alunos` |
| **Erro de API** | lança `Error` com mensagem traduzida → `error.tsx` do segmento, com `ErrorState` e retry |
| **Sem avaliações** | Cabeçalho + resumo normais; `EmptyState` "Nenhuma avaliação registrada ainda"; sem histórico, comparação ou testes |
| **Uma avaliação** | Sem comparação, com aviso de §4.8; histórico com 1 linha; testes normais |
| **Avaliação parcial** | Linha presente, células nulas como `—` (§4.3) |

---

## 6. Estrutura de componentes

**[FATO]** A E1 é inteiramente de leitura. **Nenhum componente novo precisa ser
Client**, exceto o `error.tsx` (exigência do framework).

| Componente | Tipo | Responsabilidade | Props |
| --- | --- | --- | --- |
| `app/alunos/[id]/page.tsx` | **Server** | `await params`, buscar dados, tratar 404/erro, compor seções | — |
| `app/alunos/[id]/loading.tsx` | Server | Esqueleto | — |
| `app/alunos/[id]/error.tsx` | **Client** (`"use client"`) | Boundary do segmento, reusa `ErrorState` | `error`, `reset` |
| `app/alunos/[id]/not-found.tsx` | Server | 404 com link para `/alunos` | — |
| `features/alunos/AlunoCabecalho.tsx` | **portátil** | Nome, status, idade, total, data mais recente | `aluno: AlunoDetalhe`, `totalAvaliacoes: number`, `dataMaisRecente: string \| null` |
| `features/alunos/HistoricoAvaliacoes.tsx` | **portátil** | Tabela do histórico | `avaliacoes: AvaliacaoCompleta[]` |
| `features/alunos/ComparacaoAvaliacoes.tsx` | **portátil** | Tabela atual × anterior × variação | `atual: AvaliacaoCompleta`, `anterior: AvaliacaoCompleta` |
| `features/alunos/TestesAvaliacao.tsx` | **portátil** | Tabelas de tentativas | `avaliacao: AvaliacaoCompleta` |

**[DECISÃO]** "Portátil" = sem diretiva própria (executa onde o chamador executa).
Como todos são chamados de um Server Component, **todos renderizam no servidor**
nesta etapa. Nomenclatura conforme `frontend-plan.md:308` e a lição registrada na
Unidade 4 da E0.

**Composição:** `page.tsx` busca tudo, decide os ramos vazios e passa dados
prontos por props. Nenhum componente filho busca dados, formata regra de negócio
ou decide estado vazio de nível de página.

---

## 7. Estrutura de arquivos

### Criar

```
src/app/alunos/[id]/page.tsx
src/app/alunos/[id]/loading.tsx
src/app/alunos/[id]/error.tsx
src/app/alunos/[id]/not-found.tsx
src/features/shared/origem.ts
src/features/shared/formato.ts
src/features/alunos/AlunoCabecalho.tsx
src/features/alunos/HistoricoAvaliacoes.tsx
src/features/alunos/ComparacaoAvaliacoes.tsx
src/features/alunos/TestesAvaliacao.tsx
```

### Alterar

| Arquivo | Mudança | Motivo |
| --- | --- | --- |
| `src/features/alunos/tipos.ts` | + `AlunoDetalhe`, `AvaliacaoResumo`, `AvaliacaoCompleta` | §8.5 |
| `src/features/alunos/AlunosTabela.tsx` | nome do aluno vira `<Link href={/alunos/${id}}>` | navegação lista → ficha |
| `src/app/alunos/page.tsx` | remove `origemAtual` local; importa de `@/features/shared/origem` | §8.4 |
| `src/features/alunos/utils.ts` | + helpers de colunas/comparação de medidas | §9 |

### Preservar sem tocar

`src/app/api/**`, `src/lib/**`, `prisma/**`, `src/components/ui/**`,
`src/features/shared/{api,erros}.ts`, `src/app/globals.css`,
`src/app/layout.tsx`, `src/app/alunos/{loading,error}.tsx`,
`src/features/alunos/BuscaEFiltroAlunos.tsx`, `package.json`, `eslint.config.mjs`.

---

## 8. Estratégia de dados

### 8.1 As duas chamadas

**[DECISÃO]** Ambas necessárias, em **paralelo** via `Promise.all`:

| Chamada | Fornece | Por que é indispensável |
| --- | --- | --- |
| `GET /api/alunos/:id` | `nome`, `dataNascimento`, `ativo`, lista completa de avaliações (id/data/observações) | Única fonte de `dataNascimento`/`ativo` e **único endpoint que 404 em aluno inexistente** |
| `GET /api/avaliacoes?alunoId=<id>&limite=200` | `medidas` e `testes` de cada avaliação | `GET /alunos/:id` **não traz medidas** (§3.1) |

**[DECISÃO]** Passar `limite=200` explicitamente (máximo permitido). O default de
50 seria suficiente para o volume conhecido (~21 avaliações em 3 anos por atleta,
`planilha-atual.md`), mas o explícito elimina truncamento silencioso.

### 8.2 Ordem de tratamento de erro — obrigatória

**[DECISÃO]** Como `apiFetch` devolve resultado discriminado (não lança), avaliar
**nesta ordem exata**:

1. Resultado do **aluno**: se `!ok && erro.status === 404` → `notFound()`.
   Isso cobre tanto UUID inexistente quanto id malformado (§3.3).
2. Resultado do **aluno**: se `!ok` por qualquer outro status →
   `throw new Error(erro.mensagem)`.
3. Resultado das **avaliações**: se `!ok` → `throw new Error(erro.mensagem)`.

**Inverter os passos 1 e 3 é um defeito**: para `/alunos/abc`, as avaliações
retornam 422 e o usuário veria "dados inválidos" em vez do 404 correto.

**[DECISÃO]** Não há tratamento de "erro parcial": se o aluno carregou mas as
avaliações falharam, a página **inteira** vai para o boundary de erro. Renderizar
meia ficha silenciosamente seria pior que um erro honesto com retry.

### 8.3 Total de avaliações e data mais recente

**[DECISÃO]** Ambos derivados de **`GET /alunos/:id`**, nunca da lista limitada:

- `totalAvaliacoes = aluno.avaliacoes.length` — **[FATO]** esse array não tem
  `take`, é sempre completo.
- `dataMaisRecente = aluno.avaliacoes[0]?.dataAvaliacao ?? null` — **[FATO]** já
  vem ordenado desc.

**[RISCO]** Se um aluno tiver > 200 avaliações, a tabela de histórico e a
comparação usam só as 200 mais recentes, enquanto a contagem permanece correta.
Improvável (21 em 3 anos) e a comparação atual × anterior não é afetada. Aceito,
sem aviso na interface.

### 8.4 Extração de `origemAtual` — sim, agora

**[DECISÃO]** **Extrair para `src/features/shared/origem.ts`.** A regra registrada
em `src/app/alunos/page.tsx:9-11` ("quando uma segunda página precisar do mesmo,
promove para features/shared") é acionada agora — esta é a segunda ocorrência real.

- `origem.ts` é o **único** arquivo do frontend que importa `next/headers`.
- Exporta uma função assíncrona que devolve a origem absoluta a partir de `host` e
  `x-forwarded-proto` (com fallback `"http"`), idêntica à implementação atual.
- `src/app/alunos/page.tsx` passa a importá-la; o comentário sobre promoção futura
  sai junto.
- **[FATO]** `src/features/shared/api.ts` continua **sem** importar `next/headers`
  — permanece seguro para Client Components futuros.

### 8.5 Tipos

**[DECISÃO]** Em `src/features/alunos/tipos.ts`:

- `AvaliacaoResumo` — `{ id: string; dataAvaliacao: string; observacoes: string | null }`,
  declarado à mão (o backend não exporta serializador para esse `select`).
- `AlunoDetalhe` — `{ id; nome; dataNascimento: string | null; ativo: boolean; avaliacoes: AvaliacaoResumo[] }`.
- `AvaliacaoCompleta` — **derivado**:
  `ReturnType<typeof serializarAvaliacao> & { alunoNome: string }`, com
  `import type { serializarAvaliacao } from "@/lib/avaliacoes"`.

**[FATO]** `import type` é apagado na compilação: custo zero em runtime, e
`npm run typecheck` quebra se o backend mudar o formato — exatamente a mitigação
do risco R3 de `frontend-plan.md`. `@/lib/avaliacoes` é permitido **somente como
tipo** (`frontend-plan.md:603`).

**[FATO] Proibido importar** `@/lib/prisma`, `@/lib/http`, `@/generated/prisma/**`
(`frontend-plan.md:607-613`).

### 8.6 Cache e revalidação

**[DECISÃO]** Nenhum cache adicional. `fetch` não é cacheado por padrão no Next 16.
Sem `revalidate`, sem `use cache`, sem `cacheComponents`. Sem `cache()` do React
(cada leitura ocorre uma única vez por requisição). Não há mutação na E1, portanto
não há revalidação.

**[FATO]** O uso de `headers()` torna a rota dinâmica automaticamente, impedindo
prerender contra um servidor fora do ar (risco R4 do plano).

---

## 9. Estratégia de comparação

### 9.1 Ordenação

**[FATO]** A API já entrega decrescente por `dataAvaliacao` (`route.ts:19`).

**[DECISÃO]** **Não reordenar.** Consumir na ordem recebida. Índice `0` = mais
recente. Ordenar de novo no cliente seria duplicar regra e arriscar divergir do
backend.

**[SUPOSIÇÃO]** Duas avaliações na mesma data mantêm ordem estável entre
requisições. Não confirmado (o backend não tem desempate explícito). Impacto
baixo: afetaria apenas qual das duas é considerada "anterior" num empate de data.
Não tratar na E1.

### 9.2 Localizar a avaliação anterior

**[DECISÃO]** `atual = avaliacoes[0]`, `anterior = avaliacoes[1]`.
Se `avaliacoes.length < 2`, não há comparação (§4.8). Nada mais sofisticado:
"anterior" é literalmente a avaliação imediatamente anterior em data.

### 9.3 Montar as linhas de comparação

**[DECISÃO]** Iterar `MEDIDAS` na ordem do array. Para cada definição:

- `bilateral: true` → gerar duas linhas, uma por lado (`direito`, depois
  `esquerdo`), rótulo `siglaComLado(sigla, lado)`, valores
  `avaliacao.medidas[chave][lado]`.
- `bilateral: false` → gerar uma linha, rótulo `sigla`, valor
  `avaliacao.medidas[chave].valor`.

Cada linha resulta em: `rotulo`, `unidade`, `valorAnterior`, `valorAtual`, `delta`.

**[DECISÃO]** Todas as 9 linhas são sempre renderizadas, mesmo quando ambos os
valores são nulos — a ausência é informação para o professor (mostra o que deixou
de ser medido). Não filtrar linhas vazias.

### 9.4 Regra do delta

`delta = null` se `valorAtual === null` **ou** `valorAnterior === null`.
Caso contrário, `arredondar(valorAtual - valorAnterior, 2)`.

### 9.5 Exemplos concretos

Com `atual` de 30/04/2026 e `anterior` de 19/03/2026:

| Linha | Anterior | Atual | Delta calculado | Exibição |
| --- | --- | --- | --- | --- |
| `TOR DIR` | `12.1` | `12.4` | `0.3` | Anterior `12,1` · Atual `12,4` · Variação **`+0,3`** |
| `TOR ESQ` | `13.4` | `13.1` | `-0.3` | `13,4` · `13,1` · **`-0,3`** |
| `QUA DIR` | `19.9` | `19.9` | `0` | `19,9` · `19,9` · **`0`** (leitor: "sem variação") |
| `SLB ESQ` | `31.9` | `32.5` | `0.6000000000000014` → arredondado `0.6` | `31,9` · `32,5` · **`+0,6`** |
| `IQT DIR` | `null` | `22.7` | **não calcular** | **`—`** · `22,7` · **`—`** |
| `IQT ESQ` | `21.0` | `null` | **não calcular** | `21` · **`—`** · **`—`** |
| `CMJ` | `null` | `null` | **não calcular** | **`—`** · **`—`** · **`—`** |
| `CMJ` (zero real) | `0` | `2.5` | `2.5` | **`0`** · `2,5` · **`+2,5`** — zero **é** medição |

Note as duas últimas linhas: `null` nunca vira `0`, e `0` nunca vira `—`.

### 9.6 Fronteira de domínio

**[DECISÃO]** A comparação é **subtração entre dois números já exibidos na tela** —
apresentação, autorizada por `frontend-plan.md:155`. Não estende a nada mais:
sem percentual de variação (exigiria decidir a base e lidar com divisão por zero),
sem tendência sobre múltiplas avaliações, sem "melhor marca histórica", sem
projeção. Qualquer um desses é regra de domínio e pertence ao backend.

---

## 10. UX e acessibilidade

### Headings e landmarks

- Um único `<h1>` por página: **o nome do aluno**.
- `<h2>` para cada seção: "Resumo", "Comparação com a avaliação anterior",
  "Histórico de avaliações", "Testes da avaliação mais recente".
- Conteúdo dentro de `<main>` (já é o padrão das páginas existentes).
- Hierarquia sem saltos (nunca `h1` → `h3`).

### Navegação e foco

- Link de retorno "← Alunos" é o **primeiro** elemento focável da página.
- Ordem de tab segue a ordem visual: retorno → (links do histórico, se houver) → fim.
- **[FATO]** O fallback de foco visível já existe em `Button` e `Input`
  (Unidade 5 da E0). Para **links**, garantir foco visível próprio: os `<a>` não
  herdam esse fallback. Aplicar contorno em `focus-visible` com
  `outline-2 outline-offset-2 outline-current` — mesma abordagem independente de
  token, já aprovada, enquanto os tokens da Nova seguem pendentes (§0.4 do plano).

### Tabelas

- `<caption>` em cada tabela, mesmo que visualmente oculto (`sr-only`), descrevendo
  o conteúdo ("Histórico de avaliações de Ana Prado").
- `scope="col"` em todo cabeçalho de coluna; `scope="row"` na primeira célula de
  cada linha das tabelas de comparação e de tentativas.
- Célula com `—` deve ter alternativa textual: `<abbr title="Não medido">` ou
  `<span aria-label="não medido">` — leitor de tela não deve anunciar apenas
  "traço".
- Cabeçalhos com sigla usam `<abbr title="Mobilidade de tornozelo (direito)">`
  para expandir o significado.
- **Não** usar `aria-live` — a página é estática, sem atualização dinâmica.

### Estados vazios

- Sem avaliações: `EmptyState` com título "Nenhuma avaliação registrada ainda" e
  descrição neutra. **Sem** botão de ação (criar avaliação é da E5).
- Primeira avaliação: aviso textual, não `EmptyState` (há conteúdo na página).

### Nomes longos, zoom e viewport

- Nome do aluno no `<h1>` deve quebrar (`break-words`), nunca estourar a largura.
- Célula de data e rótulos de sigla podem permanecer `whitespace-nowrap` (curtos).
- Em zoom 200% / fontes ampliadas: nada de altura fixa em contêiner de texto;
  usar espaçamento por padding e deixar o conteúdo crescer.
- 360 px: sem rolagem horizontal na página; a tabela de histórico rola dentro do
  próprio contêiner.

---

## 11. Primitivos de UI

### Reutilizar como estão

`Table` e subcomponentes · `Badge` · `Card` (e subcomponentes — **primeira
utilização real no projeto**) · `Skeleton` · `EmptyState` · `ErrorState` ·
`Button` (apenas dentro do `ErrorState`).

### Componentes shadcn adicionais

**[DECISÃO] Nenhum.** A E1 não precisa de nada além do já instalado. Se o
implementador julgar necessário adicionar algum (ex.: `separator`), isso é uma
**parada** (§15) — não instalar por conta própria.

### Componentes próprios novos

Os quatro de domínio da §6. Nenhum primitivo genérico novo é necessário.

### Dependências

**[DECISÃO] Nenhuma dependência nova.** `next/link` já faz parte do Next.
Formatação usa `Intl` nativo. Qualquer necessidade de dependência é **parada**
obrigatória (§15).

---

## 12. Critérios de aceite

### Navegação e rota

- [ ] Clicar no nome de um aluno em `/alunos` leva a `/alunos/<id>` daquele aluno.
- [ ] O link de nome é focável por teclado e tem foco visível.
- [ ] `/alunos/<uuid-existente>` responde 200 e renderiza a ficha.
- [ ] `/alunos/<uuid-inexistente>` renderiza o `not-found.tsx` do segmento
      (não o boundary de erro, não tela branca).
- [ ] `/alunos/abc` (id malformado) **também** renderiza o `not-found`, não um
      erro de "dados inválidos" — valida a ordem da §8.2.
- [ ] O `not-found` tem link de volta para `/alunos`.

### Dados e contrato

- [ ] Nome, status (Ativo/Inativo) e data da avaliação mais recente conferem com
      a resposta da API para o mesmo id (comparar com `curl`).
- [ ] Total de avaliações vem de `GET /alunos/:id` e bate com o `totalAvaliacoes`
      de `GET /alunos` para o mesmo aluno.
- [ ] Histórico traz uma linha por avaliação, em ordem **decrescente** de data.
- [ ] Datas exibidas batem exatamente com as retornadas (uma avaliação de
      `"2026-04-30"` aparece como `30/04/2026`, nunca `29/04/2026`).
- [ ] Colunas do histórico, na ordem: Data, TOR DIR, TOR ESQ, QUA DIR, QUA ESQ,
      IQT DIR, IQT ESQ, SLB DIR, SLB ESQ, CMJ.
- [ ] Nenhuma chamada HTTP além das duas previstas (conferir no terminal do
      `npm run dev`).

### Nulo, zero e parcial

- [ ] Medida `null` aparece como `—`, com alternativa textual para leitor de tela.
- [ ] Medida `0` aparece como `0`, nunca como `—`.
- [ ] Nenhum lugar do código usa `||`, `!valor` ou coerção booleana para decidir
      ausência de medida (revisão de código, não visual).
- [ ] Avaliação com algumas medidas nulas renderiza a linha inteira, sem quebrar.

### Comparação

- [ ] Aluno com ≥2 avaliações mostra a seção de comparação com as 9 linhas.
- [ ] Variação positiva aparece com `+`, negativa com `-`, nula como `0`.
- [ ] Variação não é calculada quando qualquer um dos lados é `null` → `—`.
- [ ] Nenhuma cor ou ícone sugere "melhorou"/"piorou".
- [ ] Aluno com exatamente 1 avaliação: seção substituída pelo aviso de primeira
      avaliação, sem erro.

### Estados

- [ ] Aluno sem avaliações: cabeçalho e resumo normais + `EmptyState`, sem
      histórico/comparação/testes, sem erro.
- [ ] Aluno sem `dataNascimento`: campo de idade **omitido**, sem `—` nem quebra.
- [ ] Avaliação com `testes: []`: seção de testes mostra vazio curto, sem sumir.
- [ ] API fora do ar: `error.tsx` do segmento com mensagem amigável e retry
      funcional; sem stack trace nem texto cru da API.
- [ ] `loading.tsx` espelha a estrutura real (cabeçalho, resumo, tabelas) sem
      deslocamento perceptível ao carregar.

### Acessibilidade

- [ ] Exatamente um `<h1>`, contendo o nome do aluno.
- [ ] Hierarquia de headings sem saltos.
- [ ] Toda tabela tem `<caption>` e `scope` nos cabeçalhos.
- [ ] Navegação completa por teclado, com foco sempre visível.
- [ ] Siglas expandidas via `abbr`/`title`.

### Responsividade

- [ ] 360 px: sem rolagem horizontal na página; histórico rola no próprio contêiner.
- [ ] Tablet e desktop: layout coerente com `/alunos`.
- [ ] Nome muito longo quebra em vez de estourar.
- [ ] Zoom 200%: sem sobreposição nem corte de texto.

### Automático

- [ ] `npm run typecheck` limpo.
- [ ] `npm run lint` limpo.
- [ ] `npm run build` limpo, com `/alunos/[id]` listada como `ƒ` (dinâmica).
- [ ] Nenhum arquivo de `prisma/`, `src/app/api/` ou `src/lib/` alterado.
- [ ] `package.json` e `package-lock.json` inalterados.

---

## 13. Plano de execução

Cinco unidades, implementáveis **numa única sessão**, sem aprovação entre elas.

### U1 — Fundação de dados e rota

**Objetivo.** Rota respondendo com dados reais, sem acabamento.
**Arquivos.** Criar `src/features/shared/origem.ts`, `src/features/shared/formato.ts`;
alterar `src/app/alunos/page.tsx` (importar origem), `src/features/alunos/tipos.ts`;
criar `src/app/alunos/[id]/page.tsx` (versão mínima: busca, 404, erro, imprime nome).
**Dependências.** Nenhuma.
**Validação.** `typecheck`, `lint`, `build`; `curl` em id válido, inválido e malformado.

### U2 — Navegação e cabeçalho

**Objetivo.** Chegar na ficha pela lista e ver o resumo.
**Arquivos.** Alterar `src/features/alunos/AlunosTabela.tsx` (link);
criar `src/features/alunos/AlunoCabecalho.tsx`; compor em `page.tsx`.
**Dependências.** U1.
**Validação.** `typecheck`, `lint`, `build`; navegação manual da lista até a ficha.

### U3 — Histórico

**Objetivo.** Tabela do histórico com as siglas.
**Arquivos.** Alterar `src/features/alunos/utils.ts` (helpers de coluna);
criar `src/features/alunos/HistoricoAvaliacoes.tsx`; compor em `page.tsx`.
**Dependências.** U2.
**Validação.** `typecheck`, `lint`, `build`; conferir ordem, datas e siglas contra `curl`.

### U4 — Comparação e testes

**Objetivo.** Seções de comparação e de tentativas.
**Arquivos.** Criar `src/features/alunos/ComparacaoAvaliacoes.tsx` e
`src/features/alunos/TestesAvaliacao.tsx`; alterar `utils.ts` (linhas de
comparação e delta); compor em `page.tsx`.
**Dependências.** U3.
**Validação.** `typecheck`, `lint`, `build`; conferir os exemplos da §9.5.

### U5 — Estados, acessibilidade e responsividade

**Objetivo.** Fechar a etapa.
**Arquivos.** Criar `src/app/alunos/[id]/{loading,error,not-found}.tsx`; ajustes
finais de a11y/responsividade nos componentes das unidades anteriores.
**Dependências.** U4.
**Validação.** Checklist da §12 inteiro; `typecheck`, `lint`, `build`.

### Verificação dos estados que o seed não cobre

**[FATO] Verificado em 31/07/2026:** o seed tem **0 valores nulos, 0 zeros reais,
0 avaliações sem testes**, e **nenhum** aluno sem avaliações, sem data de
nascimento ou inativo (144 valores de medida conferidos, todos preenchidos).

**[DECISÃO]** Estes estados **não podem ser verificados** só navegando com o seed.
Verificar com **alteração temporária e reversível de código** (técnica já aprovada
na Unidade 3 da E0): forçar o ramo desejado, conferir via `curl`, **reverter
imediatamente**, e confirmar com `git diff` que nada sobrou antes das validações
finais. **Não alterar o banco, não rodar `db:seed`, não escrever via API.**

Estados a verificar assim: medida nula, medida zero, aluno sem avaliações,
aluno com uma única avaliação, aluno sem data de nascimento, avaliação sem testes.

---

## 14. Estratégia de commits

Um commit por unidade, Conventional Commits, mensagem em inglês (padrão do
repositório desde a E-1). **Sem aprovação entre commits; sem `push`.**

| # | Mensagem sugerida |
| --- | --- |
| 1 | `refactor(frontend): extract shared origin and formatting helpers` |
| 2 | `feat(alunos): add student detail route with header and navigation` |
| 3 | `feat(alunos): add evaluation history table` |
| 4 | `feat(alunos): add evaluation comparison and test details` |
| 5 | `feat(alunos): add detail page states, accessibility and responsiveness` |

O implementador pode redividir, desde que cada commit permaneça coeso,
reversível e com `typecheck`/`lint` limpos.

---

## 15. Regras de autonomia

### Pode decidir sozinho, sem perguntar

Nomes de variáveis, funções e componentes · organização interna dos arquivos ·
espaçamentos, tamanhos e classes Tailwind · composição e divisão de
subcomponentes · textos de interface em português (mantendo o tom já existente) ·
melhorias pontuais de acessibilidade além do exigido · refactors locais dentro
dos arquivos que já está tocando · divisão exata dos commits · ordem interna
dentro de uma unidade · escolha entre `abbr`, `title` ou `aria-label` para
alternativas textuais.

### Deve parar e reportar

1. Necessidade de alterar `prisma/**`, `src/app/api/**` ou `src/lib/**`.
2. Necessidade de qualquer dependência nova (incluindo componente shadcn adicional).
3. Conflito real entre esta spec e `docs/frontend-plan.md`.
4. Necessidade de mudar arquitetura (Server/Client, consumo de API, feature-first).
5. Endpoint ou campo ausente para cumprir um requisito.
6. Contrato da API divergente do documentado na §3.
7. Falha de `typecheck`/`lint`/`build` sem correção óbvia e segura.
8. Qualquer risco de perda de dados (escrita no banco, `db:seed`, `db:reset`).
9. Requisito de produto indefinido que bloqueie a implementação.
10. Necessidade de resolver a pendência de tokens da Nova (`frontend-plan.md` §0.4)
    — **continua fora de escopo**; conviver com a limitação visual.

Ao parar: descrever o achado, apresentar evidência (caminho/linha ou saída de
comando), propor alternativas, e aguardar decisão. Não contornar por conta própria.

---

## 16. Protocolo de execução

1. Ler este documento inteiro antes de escrever qualquer linha.
2. Reler `docs/frontend-plan.md` e `docs/api.md` (autoridade acima desta spec).
3. Implementar U1 → U5, na ordem.
4. Rodar `npm run typecheck` e `npm run lint` ao fim de cada unidade;
   `npm run build` ao fim de cada unidade que toque rota, fronteira Server/Client
   ou integração com a API (na prática, todas).
5. Verificar manualmente o que o seed cobre; usar a técnica reversível da §13 para
   o que ele não cobre.
6. Commitar por unidade, sem `push`, sem `merge`, sem `rebase`, sem troca de branch.
7. Ao final, rodar `typecheck`, `lint` e `build` uma última vez e percorrer o
   checklist da §12.
8. Apresentar relatório final: resumo, arquivos criados/alterados, validações com
   resultado, verificações manuais realizadas **e as não realizadas**, decisões
   tomadas dentro da autonomia, divergências encontradas, e `git log` da etapa.
9. Parar apenas nos casos da §15.

**Honestidade de relatório:** o que não foi verificado deve ser declarado como não
verificado. Não afirmar confirmação visual sem tê-la feito.

---

## Apêndice — riscos herdados

| Risco | Origem | Efeito na E1 |
| --- | --- | --- |
| Tokens da Nova pendentes | `frontend-plan.md` §0.4 | `Card` e `Badge` sem cor de fundo real; contraste ainda não é o definitivo. Conviver, não remendar |
| Contrato de saída não tipado | `frontend-plan.md` R3 | Mitigado por derivar `AvaliacaoCompleta` de `ReturnType` (§8.5) |
| Fuso horário em data ISO curta | `frontend-plan.md` R5 | Mitigado por §4.1; é o defeito mais provável desta etapa |
| Ferramenta de navegador indisponível | sessões da E0 | Verificação visual real (foco, 360 px, zoom 200%) pode não ser possível; declarar no relatório |
