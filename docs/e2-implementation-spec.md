# E2 — Especificação de implementação

> # ⚠️ PARCIALMENTE OBSOLETO — 05/08/2026
>
> **Este documento descreve uma tela que não existe mais como especificada.**
> Ele é mantido como **registro do que foi implementado em 31/07/2026**, não
> como instrução a seguir. Onde divergir de [`api.md`](api.md), vale `api.md`.
>
> **O que caiu.** A curva força-velocidade, o ajuste (`V0`, `F0`, `r²`,
> inclinação, carga ótima), o `perfil` e o `score` **saíram do relatório** por
> decisão de produto. Motivo: o modelo v2 reduziu a curva de 8 pontos para no
> máximo 2 — um por exercício — e com 2 pontos a reta é exata por construção,
> então `r²` daria `1` sempre. `src/lib/calculos.ts` foi **apagado**.
>
> Na prática isso invalida as seções que tratam de curva, análise técnica,
> cards de score e perfil, e todas as referências a `@/lib/calculos`.
>
> **O que continua valendo:** medidas, `medidasDetalhadas`, histórico de CMJ,
> `resumoCmj`, período/janela de semanas, textos placeholder, e as convenções
> de acessibilidade, impressão e composição Server/Client.
>
> **O que entrou no lugar:** `velocidade` e `velocidadeDetalhada` — carga e
> tempo como o professor digitou, sem nenhuma derivação. Ver `api.md`.

**Contrato operacional** da etapa E2: `/avaliacoes/[id]/relatorio`, a primeira
versão do relatório de performance, sem gráficos.

Escrito em **31/07/2026**, a partir do código real e de **requisições reais** ao
endpoint de relatório. Destina-se a ser implementado numa única sessão, sem
consultas intermediárias — as lacunas já foram decididas aqui.

Convenções:

| Marca | Significado |
| --- | --- |
| **[FATO]** | confirmado no código ou por requisição real, com caminho/linha |
| **[DECISÃO]** | escolha feita aqui; implementar como está, sem rediscutir |
| **[RISCO]** | pode dar errado; mitigação indicada |
| **[LACUNA]** | dado que a API não entrega; conviver, não inventar |
| **[BLOQUEIO]** | exige intervenção humana |

Autoridade: `docs/api.md` → `docs/frontend-plan.md` → este documento.
Divergência entre eles é **[BLOQUEIO]** (§17).

---

## 1. Resumo da etapa

### Objetivo

Entregar `/avaliacoes/[id]/relatorio`: uma página de relatório de performance
completa, legível e demonstrável, montada inteiramente sobre o que
`GET /avaliacoes/:id/relatorio` já devolve. Sem gráficos, sem CSS de impressão,
sem PDF — mas com a estrutura semântica que a E3 precisará.

### Valor de produto

`docs/planilha-atual.md:23` afirma, em negrito: *"O produto não é o registro do
treino. É o relatório."* Esta é a etapa em que o produto aparece. É o artefato
que vai à frente do professor numa apresentação presencial, e o primeiro momento
em que ele pode julgar se o sistema reproduz o relatório que ele assina hoje.

### Escopo

- Acesso ao relatório a partir da ficha do aluno.
- Rota `/avaliacoes/[id]/relatorio` com `loading`, `error` e `not-found`.
- Identificação do aluno e da avaliação de referência.
- Período e contexto conforme o contrato atual.
- Cards de resumo, resumo executivo de CMJ, score, perfil.
- Curva força-velocidade em tabela; análise técnica/métricas.
- Medidas da avaliação com as siglas do professor.
- Histórico de CMJ em tabela.
- Textos interpretativos do backend (melhorias, pontos de atenção,
  recomendações, conclusão).
- Aviso claro e discreto de provisoriedade.
- Nulos, seções vazias, responsividade, acessibilidade.
- Estrutura preparada para o Print CSS da E3.

### Fora de escopo

Gráficos · CSS de impressão · PDF · WhatsApp · e-mail · período editável ·
edição de textos · alteração de fórmulas · qualquer mudança de backend ·
autenticação · filiais · botão de imprimir (§12.5).

---

## 2. Fontes de verdade

### Endpoint

| Arquivo | Papel |
| --- | --- |
| `src/app/api/avaliacoes/[id]/relatorio/route.ts:26` | `GET /api/avaliacoes/:id/relatorio` — **única** chamada da E2 |

### Fórmulas e textos (⚠️ provisórios, **não alterar, não recalcular**)

> ⚠️ **Obsoleto em 05/08/2026.** `src/lib/calculos.ts` foi apagado inteiro:
> curva, perfil e score saíram do relatório. Sobrou só a última linha.

| Arquivo | O que produz |
| --- | --- |
| ~~`src/lib/calculos.ts:79`~~ | ~~`ajustarCurva` — inclinação, v0, f0, r², carga ótima~~ — **removido** |
| ~~`src/lib/calculos.ts:125`~~ | ~~`classificarPerfil` — rótulo do perfil~~ — **removido** |
| ~~`src/lib/calculos.ts:137`~~ | ~~`calcularScore` — valor 0-100 e nível~~ — **removido** |
| ~~`src/lib/calculos.ts:38`~~ | ~~`velocidadeMedia` — velocidade de cada ponto~~ — **removido** |
| `src/lib/textos.ts:23` | `textosPlaceholder` — melhorias, atenção, recomendações, conclusão |

### Tipos exportados aproveitáveis (todos **verificados**)

| Tipo | Origem | Linha |
| --- | --- | --- |
| ~~`PontoCurva`~~ | ~~`@/lib/calculos`~~ | ⚠️ **módulo apagado (05/08/2026)** |
| ~~`AjusteCurva`~~ | ~~`@/lib/calculos`~~ | ⚠️ **módulo apagado** |
| `TextosRelatorio` | `@/lib/textos` | 16 |
| `MedidaDetalhada` | `@/lib/avaliacoes` | — |
| ~~`MedidasDTO`~~ | ~~`@/lib/schemas`~~ | ⚠️ **renomeado**: virou `AmplitudeDTO` + `SaltosDTO` |
| ~~retorno de `calcularScore`~~ | ~~`@/lib/calculos`~~ | ⚠️ **módulo apagado** |

### Componentes existentes reutilizáveis

`Table` e subcomponentes · `Card`/`CardHeader`/`CardTitle`/`CardContent` ·
`Badge` · `Skeleton` · `EmptyState` · `ErrorState` · **`ValorOuAusente`**
(`src/components/ui/valor-ausente.tsx`, criado na correção da auditoria da E1) ·
`apiFetch` · `origemAtual` · `formatarData` (`src/features/shared/formato.ts`).

### Documentação

`docs/api.md` (§ "GET /avaliacoes/:id/relatorio", linhas 139-220) ·
`docs/frontend-plan.md` (§8 estratégia do relatório, §11 R2/R6, §12) ·
`docs/planilha-atual.md:74-93` (as 10 seções do relatório real) ·
`docs/e1-implementation-spec.md` (padrões já estabelecidos).

---

## 3. Contrato real do relatório

**Tudo abaixo foi verificado por requisição real em 31/07/2026.**

### 3.1 Método, rota, parâmetros

**[FATO]** `GET /api/avaliacoes/:id/relatorio`. **Nenhum parâmetro de query é
aceito** — sem período, sem filtro, sem paginação (`route.ts:26`). O `id` é o da
**avaliação**, não do aluno.

### 3.2 Formato da resposta — 11 chaves de topo

```jsonc
{
  "aluno":     { "id": "...", "nome": "Ana Prado" },
  "avaliacao": { "id": "...", "dataAvaliacao": "2026-04-30",
                 "observacoes": "Avaliacao de exemplo." },   // string | null
  "periodo":   { "de": "2025-07-10", "ate": "2026-04-30", "totalAvaliacoes": 8 },
  "medidas":   { /* MedidasDTO: 5 chaves fixas */ },
  "medidasDetalhadas": [ /* MedidaDetalhada[] — 5 itens, achatado */ ],
  "curva": {
    "pontos": [ { "testeCodigo": "SALTO_AGACHADO", "testeNome": "SJ",
                  "cargaKg": 20, "velocidadeMs": 0.758 } ],
    "cargaMaximaKg": 60,          // number | null
    "ajuste": {                   // AjusteCurva | null
      "inclinacao": -0.01062, "v0": 0.955, "f0": 89.9,
      "r2": 0.901, "cargaOtimaKg": 45, "velocidadeOtimaMs": 0.477
    },
    "perfil": "Equilibrado"
  },
  "historicoCmj": [ { "data": "2025-07-10", "valor": 40 } ],   // pode ser []
  "resumoCmj": {                                                // objeto | null
    "inicial": { "data": "...", "valor": 40 },
    "pico":    { "data": "...", "valor": 45.95 },
    "atual":   { "data": "...", "valor": 43.53 },
    "variacaoVsInicial": 3.53, "variacaoVsPico": -2.42
  },
  "score":  { "valor": 54, "nivel": "Baixo" },
  "textos": { "melhorias": [], "pontosAtencao": [],
              "recomendacoes": [ { "foco": "Forca", "objetivo": "...",
                                   "estrategias": ["..."] } ],
              "conclusao": "..." },
  "provisorio": { "curva": "...", "score": "...", "textos": "..." }
}
```

### 3.3 Campos anuláveis — lista completa

| Campo | Quando é `null` | Fonte |
| --- | --- | --- |
| `avaliacao.observacoes` | avaliação sem observação | **ocorre no seed** |
| ~~`curva.ajuste`~~ | ⚠️ **campo removido da API em 05/08/2026** | — |
| `curva.cargaMaximaKg` | `pontos` vazio | `route.ts:78` |
| `resumoCmj` | aluno nunca teve CMJ medido | `route.ts:117` |
| valores em `medidasDetalhadas[].valores[].valor` | medida não preenchida | `avaliacoes.ts:96,103` |

**[FATO]** `historicoCmj` e `curva.pontos` são **arrays, nunca `null`** — podem
ser `[]`.

**[FATO]** `textos.*` **nunca vem vazio hoje** — `textosPlaceholder()` sempre
devolve 3 melhorias, 2 pontos de atenção, 3 recomendações e 1 conclusão. Mas o
tipo permite array vazio e string vazia; tratar como possível (§14).

### 3.4 Valores fechados de `perfil` e `nivel` — e um problema de acentuação

⚠️ **Obsoleto (05/08/2026): `perfil` não é mais devolvido pela API.**
**[FATO]** `classificarPerfil` (`calculos.ts:125-130`) só podia devolver:
`"Dados insuficientes"` · `"Orientado a forca"` · `"Equilibrado"` ·
`"Orientado a velocidade"`.

⚠️ **Obsoleto (05/08/2026): `score` não é mais devolvido pela API.**
**[FATO]** `calcularScore` (`calculos.ts:141-150`) só podia devolver `nivel`:
`"Sem dados"` · `"Alto"` · `"Medio"` · `"Baixo"` · `"Inicial"`.

**[FATO] Dois desses valores estão sem acento**: `"Orientado a forca"` (falta o
cedilha e o acento de "força") e `"Medio"` (falta o acento de "Médio"). Isso é a
dúvida **D4** de `frontend-plan.md` §12, ainda sem resposta do backend.

**[FATO] Verificado empiricamente:** rodando o relatório de **todas as 16
avaliações do seed**, o resultado é sempre `perfil = "Equilibrado"` e
`nivel = "Baixo"` (score entre 52 e 54) — justamente os dois rótulos que **não**
têm problema de acento. Os valores defeituosos **nunca aparecem navegando com o
seed**; só com o teste temporário de §14.

### 3.5 Erros

| Cenário | Status | Corpo |
| --- | --- | --- |
| UUID válido inexistente | **404** | `{"error":"Avaliacao nao encontrada"}` |
| id **malformado** (`abc`) | **404** | idem |
| erro não tratado | 500 | `{"error":"Erro interno"}` |

**[FATO] Diferença relevante em relação à E1:** esta rota **não valida o id com
Zod** — usa `findUnique` direto (`route.ts:29`), então id malformado cai em 404,
não em 422. **Não existe o problema de ordenação que a E1 tinha.** Com uma única
chamada, a lógica de erro é trivial.

### 3.6 Divergências entre `docs/api.md` e a rota real

Todas **confirmadas por requisição**, todas já registradas em
`frontend-plan.md` §11 R6. O front **convive** com elas; não corrige backend.

| # | Divergência | Evidência |
| --- | --- | --- |
| V1 | `periodo.totalAvaliacoes` conta **só avaliações com CMJ**, não o total | `route.ts:71` usa `historico.length`; `route.ts:111` pula `valor == null`. `api.md:147` sugere ser o total |
| V2 | `curva.cargaMaximaKg` **pode ser `null`** | `route.ts:78` (`?? null`). `api.md:173` mostra `50` e a lista de anuláveis em `api.md:199-201` cita só `ajuste` e `resumoCmj` |
| V3 | `periodo.ate` e `resumoCmj.atual` vêm do **histórico inteiro**, não da avaliação relatada | `route.ts:70,83` |

**[FATO] V3 comprovada agora:** pedindo o relatório da avaliação **mais antiga**
de Ana Prado (`2025-07-10`), a resposta traz `periodo.ate = "2026-04-30"` e
`resumoCmj.atual = { data: "2026-04-30", valor: 43.53 }` — **dados posteriores à
avaliação do relatório**. O `historicoCmj` também inclui pontos futuros.

**[DECISÃO]** V3 é o maior risco de leitura errada desta etapa. A mitigação é
**rotulagem precisa** (§5.6) — jamais chamar de "atual" algo que é "mais recente
do histórico". Não tentar corrigir no front recortando dados: isso seria assumir
regra de domínio.

---

## 4. Fonte de verdade de cada seção

**[DECISÃO] A E2 faz UMA única chamada HTTP.** O endpoint de relatório já entrega
tudo, inclusive `aluno.id` (necessário para o link de volta). **Não chamar**
`/api/alunos/:id` nem `/api/avaliacoes`.

| Dado na tela | Origem |
| --- | --- |
| Nome do aluno, link de volta | `relatorio.aluno.nome`, `relatorio.aluno.id` |
| Data da avaliação, observações | `relatorio.avaliacao` |
| Período, total de avaliações | `relatorio.periodo` |
| Cards de resumo | `resumoCmj.atual`, `score`, `curva.perfil` |
| Resumo executivo de CMJ | `relatorio.resumoCmj` |
| Tabela da curva | `relatorio.curva.pontos`, `curva.cargaMaximaKg` |
| Análise técnica / métricas | `relatorio.curva.ajuste` |
| Medidas da avaliação | `relatorio.medidasDetalhadas` |
| Histórico de CMJ | `relatorio.historicoCmj` |
| Textos | `relatorio.textos` |
| Aviso de provisoriedade | `relatorio.provisorio` |
| Formatação de datas/números | derivação **puramente visual** no front |

**[DECISÃO]** Usar **`medidasDetalhadas`**, não `medidas`. Ele já vem achatado,
com `sigla` (`TOR DIR`), `rotulo` e `unidade` prontos — **não importar `MEDIDAS`
de `@/lib/medidas` nesta etapa** e não repetir a derivação de colunas da E1.
`relatorio.medidas` (formato DTO) fica sem uso na E2.

---

## 5. Regras de apresentação

### 5.1 Ordem das seções

Espelha o relatório real do professor (`planilha-atual.md:74-93`) no que a API
permite. **Implementar exatamente nesta ordem:**

| # | Seção | `<h2>` | Fonte |
| --- | --- | --- | --- |
| 0 | Navegação de volta | — | `aluno.id` |
| 1 | Cabeçalho | `<h1>` | `aluno`, `avaliacao`, `periodo` |
| 2 | Aviso de provisoriedade | — | `provisorio` |
| 3 | Cards de resumo | "Visão geral" | `resumoCmj`, `score`, `perfil` |
| 4 | Resumo executivo | "Resumo executivo" | `resumoCmj` |
| 5 | Curva força-velocidade | "Curva força-velocidade" | `curva.pontos` |
| 6 | Análise técnica | "Análise técnica" | `curva.ajuste` |
| 7 | Medidas da avaliação | "Medidas da avaliação" | `medidasDetalhadas` |
| 8 | Histórico de CMJ | "Histórico de CMJ" | `historicoCmj` |
| 9 | Melhorias identificadas | "Melhorias identificadas" | `textos.melhorias` |
| 10 | Pontos de atenção | "Pontos de atenção" | `textos.pontosAtencao` |
| 11 | Recomendações de treino | "Recomendações de treino" | `textos.recomendacoes` |
| 12 | Conclusão | "Conclusão" | `textos.conclusao` |

**[DECISÃO] "Análise técnica" e "Métricas principais" foram fundidas.** O
relatório real tem as duas (seções 4 e 7), mas ambas sairiam do mesmo objeto
`ajuste` — seriam os mesmos 6 números impressos duas vezes. Uma seção só, com
tabela de métricas.

**[LACUNA]** A seção 3 do relatório real ("Evolução da curva", sobreposição de
anos + comparação em pontos-chave) e o `Pmáx` da seção 7 **não existem na API**.
Não inventar. É o bloqueio **B2** de `frontend-plan.md` §12, ainda aberto.

**[DECISÃO]** O score **não ganha seção própria no fim** (como no relatório real,
seção 10). Ele aparece uma vez, no card de resumo. Repetir o mesmo número em dois
lugares é duplicação sem ganho.

### 5.2 Unidades e casas decimais

**[DECISÃO]** Tabela fechada. A unidade vai no **cabeçalho da coluna ou no
rótulo**, nunca repetida em cada célula.

| Campo | Unidade | Casas decimais (máx.) |
| --- | --- | --- |
| `cargaKg`, `cargaMaximaKg`, `f0`, `cargaOtimaKg` | kg | 2 |
| `velocidadeMs`, `v0`, `velocidadeOtimaMs` | m/s | 3 |
| `inclinacao` | m/s por kg | **5** |
| `r2` | — (adimensional, 0 a 1) | 3 |
| `score.valor` | — (0 a 100) | 0 (inteiro) |
| CMJ e medidas (`valor`) | cm | 2 |
| `variacaoVsInicial`, `variacaoVsPico` | cm | 2 |

**[FATO] Por que 5 casas na inclinação:** o valor real é `-0.01062`. O formatador
atual (`formatarNumeroOuTraco`, máx. 2 casas) o exibiria como `-0,01`, perdendo a
informação inteira. **O `formato.ts` precisa ganhar um formatador com casas
configuráveis** (§8), sem alterar o comportamento do já existente, que a E1 usa.

### 5.3 Datas

**[DECISÃO]** Reusar `formatarData` de `@/features/shared/formato` — já resolve o
bug de fuso (`R5` do plano). Todas as datas do relatório são strings
`"AAAA-MM-DD"`: `avaliacao.dataAvaliacao`, `periodo.de`, `periodo.ate`,
`historicoCmj[].data`, `resumoCmj.{inicial,pico,atual}.data`.
Formato exibido: `30/04/2026`. **Proibido** `new Date` sobre a string curta.

### 5.4 Nulo × zero × ausência

**[DECISÃO]** Regra idêntica à E1, sem exceção:

- `null` → **`—`**, sempre via o componente **`ValorOuAusente`**
  (`src/components/ui/valor-ausente.tsx`), que dá a alternativa textual para
  leitor de tela. **Nunca** renderizar `"—"` cru.
- `0` → **`0`**. Zero é medição real (`planilha-atual.md:139-141`).
- Proibido `||`, `!valor` ou coerção booleana para decidir ausência. Usar
  `=== null`.
- `avaliacao.observacoes === null` → **omitir a linha inteira**, não mostrar `—`
  (mesmo tratamento que a E1 deu a "Avaliação mais recente").

### 5.5 Seções e tabelas vazias

| Situação | Comportamento |
| --- | --- |
| `curva.pontos` vazio | Seção presente, `EmptyState` "Nenhum ponto de carga registrado nesta avaliação" |
| `curva.ajuste === null` | Seção "Análise técnica" presente, `EmptyState` "Dados insuficientes para ajustar a curva". **Não** renderizar tabela de métricas com traços |
| `historicoCmj` vazio | Seção presente, `EmptyState` "Nenhum CMJ registrado no histórico" |
| `resumoCmj === null` | Seção "Resumo executivo" presente, `EmptyState` "Nenhum CMJ registrado para este aluno" |
| `textos.melhorias` / `pontosAtencao` vazios | Seção presente, `EmptyState` curto |
| `textos.conclusao` vazio (`""` ou só espaços) | Seção presente, `EmptyState` curto |
| `textos.recomendacoes` vazio | Seção presente, `EmptyState` curto |

**[DECISÃO]** Nenhuma seção some da página. Um relatório em que seções
desaparecem silenciosamente engana o leitor sobre o que foi medido. A seção fica,
declarando a ausência.

### 5.6 Rotulagem exigida pela divergência V3

**[DECISÃO]** Estes rótulos são **obrigatórios e literais**, para não afirmar algo
que os dados não sustentam:

| Campo | Rótulo proibido | Rótulo exigido |
| --- | --- | --- |
| `resumoCmj.atual` | "CMJ atual" | **"CMJ mais recente do histórico"** |
| `periodo.ate` | "até a avaliação" | **"último registro do histórico"** |
| `periodo.totalAvaliacoes` | "total de avaliações" | **"avaliações com CMJ no período"** (V1) |
| `historicoCmj` | — | legenda: "considera apenas avaliações com CMJ registrado" |

**[DECISÃO]** O cabeçalho deve deixar claro que a **avaliação de referência** é
`avaliacao.dataAvaliacao`, e que o período/histórico cobrem o aluno inteiro. Uma
frase curta abaixo do título resolve.

### 5.7 Score e perfil

**[DECISÃO]** Exibir `score.valor` como número inteiro numa escala declarada
("0 a 100"), com `score.nivel` como `Badge` ao lado.

**[DECISÃO] Sem cor semântica.** Nem no score, nem no perfil, nem no r².
Mesmo motivo da E1: atribuir verde/vermelho é interpretar desempenho, o que o
frontend não pode fazer (`frontend-plan.md:154`), ainda mais sobre uma fórmula
declaradamente inventada (`calculos.ts:133-135` — ⚠️ **arquivo apagado em
05/08/2026; o score saiu da API**). Usar sempre `Badge` neutro
(`variant="secondary"` ou `"outline"`).

**[DECISÃO] Mapa de acentuação**, em `src/features/relatorio/rotulos.ts`:

```
"Orientado a forca"      -> "Orientado a força"
"Medio"                  -> "Médio"
```

Os demais valores (`"Equilibrado"`, `"Orientado a velocidade"`,
`"Dados insuficientes"`, `"Alto"`, `"Baixo"`, `"Inicial"`, `"Sem dados"`) já
estão corretos e passam inalterados.

**Regra do mapa:** deve ser um `Record<string, string>` com **fallback ao valor
original** quando a chave não existir. Se o backend introduzir um rótulo novo,
ele aparece cru — nunca é engolido nem substituído por um genérico.

**[DECISÃO]** Isso é correção ortográfica de apresentação, **não** tradução nem
reinterpretação. Não mudar o sentido de nenhum rótulo.

### 5.8 Textos do backend

**[DECISÃO]** `textos.melhorias`, `pontosAtencao`, `recomendacoes` e `conclusao`
são renderizados **exatamente como vieram**. Proibido: reescrever, resumir,
truncar, corrigir ortografia, traduzir, reordenar ou "melhorar" o lorem ipsum.
São conteúdo do backend (`textos.ts`), e serão substituídos por texto real depois.

`recomendacoes[]` tem estrutura `{ foco, objetivo, estrategias[] }` — renderizar
`foco` como subtítulo (`<h3>`), `objetivo` como parágrafo e `estrategias` como
lista.

### 5.9 O que o frontend **nunca** deve interpretar

Lista fechada. Qualquer um destes é motivo de parada (§17):

- Recalcular velocidade, inclinação, v0, f0, r², carga ótima ou score.
- Converter `r2` em porcentagem ou em rótulo de qualidade ("bom ajuste", "ruim").
- Classificar score ou perfil como bom/ruim, por cor, ícone, seta ou texto.
- Derivar Pmáx, 1RM estimado, %1RM, MVT ou zonas de velocidade — conceitos de
  `docs/vbt.md` que **não estão na API**.
- Interpolar ou extrapolar pontos da curva.
- Comparar avaliações entre si (isso é E1, e lá é só subtração).
- Inferir significado de `SLB` (indecifrado — `planilha-atual.md`, dúvida 12).
- Ordenar `historicoCmj` ou `curva.pontos` de novo: **[FATO]** já vêm ordenados
  (`route.ts:52` por carga crescente; `route.ts:101` por data ascendente).

---

## 6. Hierarquia visual

### 6.1 Estrutura da página

```
<main>  (mx-auto w-full max-w-4xl px-6 py-12 — igual às telas da E1)
 ├─ Link "← Ficha do aluno"            -> /alunos/{aluno.id}     [oculto na impressão, E3]
 ├─ <header>
 │    <h1> Relatório de performance
 │    <p>  {aluno.nome} · avaliação de {data}
 │    <p>  período {de} a {ate} · N avaliações com CMJ
 │    <p>  observações (só se não-null)
 ├─ AvisoProvisorio                     (3 itens de `provisorio`)
 ├─ Cards de resumo (grid 1/3 colunas)  CMJ mais recente · Score · Perfil
 ├─ <section> Resumo executivo
 ├─ <section> Curva força-velocidade
 ├─ <section> Análise técnica
 ├─ <section> Medidas da avaliação
 ├─ <section> Histórico de CMJ
 ├─ <section> Melhorias identificadas
 ├─ <section> Pontos de atenção
 ├─ <section> Recomendações de treino
 ├─ <section> Conclusão
 └─ <footer>  linha discreta: gerado em {data}, dados provisórios
</main>
```

### 6.2 Tabelas — todas estreitas de propósito

| Tabela | Colunas |
| --- | --- |
| Curva | Teste · Carga (kg) · Velocidade (m/s) |
| Análise técnica | Métrica · Valor |
| Medidas | Medida · Valor (cm) |
| Histórico de CMJ | Data · CMJ (cm) |

**[DECISÃO]** Nenhuma tabela do relatório passa de 3 colunas — diferente da E1,
que tinha 10. Isso é deliberado: tabelas estreitas imprimem bem e não dependem de
rolagem horizontal, o que a E3 vai agradecer.

### 6.3 Rodapé

**[DECISÃO]** Uma linha discreta com a data de geração e um lembrete de
provisoriedade. **Não** incluir nome/assinatura do preparador físico ou CREF —
`planilha-atual.md:14-17` registra que esses dados foram omitidos de propósito, e
não estão na API.

### 6.4 Botão de imprimir

**[DECISÃO] Não incluir nesta etapa.** A E3 é dona da impressão. Um botão que
hoje geraria uma página com navegação, cards cortados e quebras aleatórias é pior
que nenhum botão. Também **não** criar botão desabilitado ou "em breve".

### 6.5 Responsividade

- Cards de resumo: 1 coluna em mobile, 3 a partir de `sm`.
- Tabelas: já embrulhadas em `overflow-x-auto` pelo componente `Table`.
- Seções empilhadas verticalmente em qualquer viewport — **a ordem de leitura é a
  mesma em mobile, tablet e desktop**. Isso não é só acessibilidade: é o que
  garante que a ordem impressa da E3 seja previsível.
- **[DECISÃO]** Proibido esconder ou reordenar conteúdo por breakpoint no
  relatório. Nada de `hidden sm:block` que remova informação.

---

## 7. Arquitetura de componentes

**[FATO]** A E2 é 100% leitura, sem interação. **Nenhum componente novo precisa
ser Client**, exceto `error.tsx` (exigência do framework).

| Componente | Tipo | Responsabilidade | Props principais |
| --- | --- | --- | --- |
| `app/avaliacoes/[id]/relatorio/page.tsx` | **Server** | `await params`, buscar, tratar 404/erro, compor | — |
| `.../loading.tsx` | Server | Esqueleto | — |
| `.../error.tsx` | **Client** | Boundary, reusa `ErrorState` | `error`, `reset` |
| `.../not-found.tsx` | Server | 404 com link para `/alunos` | — |
| `RelatorioSecao.tsx` | portátil | `<section>` + `<h2>` + classe de quebra para impressão | `titulo`, `id`, `children` |
| `RelatorioCabecalho.tsx` | portátil | `<h1>`, aluno, avaliação de referência, período, observações | `aluno`, `avaliacao`, `periodo` |
| `AvisoProvisorio.tsx` | portátil | Aviso com os 3 itens de `provisorio` | `provisorio` |
| `CardsResumo.tsx` | portátil | 3 cards: CMJ recente, score, perfil | `resumoCmj`, `score`, `perfil` |
| `ResumoCmj.tsx` | portátil | inicial / pico / mais recente + variações | `resumoCmj` |
| `CurvaTabela.tsx` | portátil | Pontos da curva + carga máxima | `curva` |
| `AnaliseTecnica.tsx` | portátil | Tabela de métricas do ajuste | `ajuste` |
| `MedidasTabela.tsx` | portátil | Medidas achatadas com siglas | `medidasDetalhadas` |
| `HistoricoCmjTabela.tsx` | portátil | Data × CMJ | `historicoCmj` |
| `ListaTextos.tsx` | portátil | Lista de bullets (melhorias e pontos de atenção) | `itens`, `mensagemVazia` |
| `Recomendacoes.tsx` | portátil | foco / objetivo / estratégias | `recomendacoes` |

**[DECISÃO]** "Portátil" = sem diretiva própria. Como todos são chamados de um
Server Component, **todos renderizam no servidor**. Nomenclatura conforme
`frontend-plan.md:308` e a lição registrada na E1.

**[DECISÃO]** `page.tsx` busca, decide os ramos vazios de nível de página e passa
dados prontos. Nenhum filho busca dados ou faz cálculo de domínio.

**[DECISÃO]** `ListaTextos` é reusado por melhorias **e** pontos de atenção
(mesma forma: `string[]`). Isso é a segunda ocorrência real — a regra de reúso da
§4.4 do plano é satisfeita, sem abstração prematura.

### Reúso da E1

| Componente da E1 | Reusar na E2? |
| --- | --- |
| `ValorOuAusente` | **Sim, obrigatório** — todo valor anulável passa por ele |
| `Table`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState` | Sim |
| `formatarData` | Sim |
| `HistoricoAvaliacoes`, `ComparacaoAvaliacoes`, `TestesAvaliacao`, `AlunoCabecalho` | **Não** — são da ficha do aluno, formato diferente |
| `colunasDeMedida` / `valorDaColuna` (`features/alunos/utils.ts`) | **Não** — o relatório usa `medidasDetalhadas`, já achatado (§4) |

---

## 8. Estrutura de arquivos

### Criar

```
src/app/avaliacoes/[id]/relatorio/page.tsx
src/app/avaliacoes/[id]/relatorio/loading.tsx
src/app/avaliacoes/[id]/relatorio/error.tsx
src/app/avaliacoes/[id]/relatorio/not-found.tsx
src/features/relatorio/tipos.ts
src/features/relatorio/rotulos.ts
src/features/relatorio/RelatorioSecao.tsx
src/features/relatorio/RelatorioCabecalho.tsx
src/features/relatorio/AvisoProvisorio.tsx
src/features/relatorio/CardsResumo.tsx
src/features/relatorio/ResumoCmj.tsx
src/features/relatorio/CurvaTabela.tsx
src/features/relatorio/AnaliseTecnica.tsx
src/features/relatorio/MedidasTabela.tsx
src/features/relatorio/HistoricoCmjTabela.tsx
src/features/relatorio/ListaTextos.tsx
src/features/relatorio/Recomendacoes.tsx
```

**[FATO]** Não é preciso criar `src/app/avaliacoes/[id]/page.tsx` — um segmento
sem `page.tsx` próprio é válido no App Router. A rota `/avaliacoes/[id]` continua
inexistente (é da E6) e `/avaliacoes/[id]/relatorio` funciona normalmente.

### Alterar

| Arquivo | Mudança | Motivo |
| --- | --- | --- |
| `src/features/shared/formato.ts` | **acrescentar** formatador com casas decimais configuráveis | §5.2 — a inclinação precisa de 5 casas |
| `src/features/alunos/HistoricoAvaliacoes.tsx` | data de cada linha vira `<Link>` para o relatório daquela avaliação | §9.2 — acesso a partir da ficha |

**[DECISÃO]** Não alterar `formatarNumeroOuTraco` nem `formatarDeltaOuTraco` — a
E1 depende deles. Apenas acrescentar.

### Proteger — não tocar

`prisma/**` · `src/app/api/**` · `src/lib/**` · `package.json` ·
`package-lock.json` · `eslint.config.mjs` · `README.md` · `prisma.config.ts` ·
`.env.example` · `src/app/globals.css` (tokens Nova seguem pendentes) ·
`src/components/ui/**` (reusar como está) · demais arquivos da E1.

---

## 9. Estratégia de dados e erros

### 9.1 Qual avaliação gera o relatório

**[DECISÃO]** A avaliação **cujo id está na URL**. Não existe conceito de
"relatório do aluno" no backend — o endpoint é por avaliação. A página não
escolhe nada.

### 9.2 Como a ficha do aluno liga para o relatório

**[DECISÃO]** Em `HistoricoAvaliacoes.tsx`, a célula de **data de cada linha**
vira um `<Link>` para `/avaliacoes/{avaliacao.id}/relatorio`.

Justificativa: a tabela já lista todas as avaliações e já tem o `id` de cada uma;
o endpoint aceita qualquer uma. Ligar só a mais recente esconderia metade da
capacidade. O link recebe o mesmo tratamento de foco visível já usado na E1
(`focus-visible:outline-2 outline-offset-2 outline-current`), porque links não
herdam o fallback de `Button`/`Input`.

**[RISCO]** Relatórios de avaliações antigas exibem `periodo.ate` e
`resumoCmj.atual` do futuro (V3). Mitigado pela rotulagem obrigatória de §5.6,
não por esconder o link.

### 9.3 Uma única chamada

```
page.tsx (Server)
  → await params           → id
  → origemAtual()          → origem absoluta
  → apiFetch<RelatorioResponse>(`${origem}/api/avaliacoes/${id}/relatorio`)
  → !ok && status === 404  → notFound()
  → !ok                    → throw new Error(mensagem traduzida)
  → ok                     → compõe as seções
```

**[DECISÃO]** Sem `Promise.all` — há uma só chamada. Sem ordenação de
resultados. O `id` vai por `encodeURIComponent`, como na E1.

### 9.4 Aluno sem avaliações

**[DECISÃO]** Não é um estado desta página. Sem avaliação não há id, e sem id não
há rota. A ficha do aluno (E1) já mostra o `EmptyState` e simplesmente não
renderiza nenhum link de relatório. Nada a fazer aqui.

### 9.5 `notFound()` × `error.tsx`

| Situação | Tratamento |
| --- | --- |
| 404 (id inexistente **ou** malformado) | `notFound()` → `not-found.tsx` do segmento |
| Qualquer outro status de falha | `throw new Error(mensagem)` → `error.tsx` do segmento |
| Resposta 200 malformada | `apiFetch` deixa o erro de `json()` propagar → `error.tsx` |

**[FATO]** `notFound()` no Next 16 responde **HTTP 200** com
`<meta name="robots" content="noindex">`, não 404 literal — comportamento
documentado do framework, já observado na E1. Não é defeito; não tentar
"corrigir".

### 9.6 Cache e revalidação

**[DECISÃO]** Nenhum cache adicional. `fetch` não é cacheado por padrão no Next
16. Sem `revalidate`, sem `use cache`, sem `cacheComponents`, sem `cache()` do
React (a leitura ocorre uma única vez). Não há mutação na E2, logo não há
revalidação. `origemAtual()` usa `headers()`, o que torna a rota dinâmica e
impede prerender indevido.

### 9.7 Tipos

**[DECISÃO]** Em `src/features/relatorio/tipos.ts`, derivar o máximo possível e
declarar à mão só o que o backend não exporta:

| Parte | Estratégia |
| --- | --- |
| `medidasDetalhadas` | `MedidaDetalhada[]` de `@/lib/avaliacoes` (**derivado**) |
| ~~`curva.pontos`~~ | ⚠️ **removido em 05/08/2026** — ver `velocidadeDetalhada` em `api.md` |
| ~~`curva.ajuste`~~ | ⚠️ **removido em 05/08/2026** |
| ~~`score`~~ | ⚠️ **removido em 05/08/2026** |
| `textos` | `TextosRelatorio` de `@/lib/textos` (**derivado**) |
| `medidas` | `MedidasDTO` de `@/lib/schemas` (**derivado**, embora sem uso) |
| `aluno`, `avaliacao`, `periodo`, `historicoCmj`, `resumoCmj`, `provisorio` | **declarados à mão** — não há tipo exportado |

**[FATO]** `PontoCmj` e o retorno de `resumirCmj` são **locais e não exportados**
(`route.ts:95,116`). Declarar à mão é a única opção.

**[FATO]** Todos os imports de `@/lib/*` aqui são **`import type`** — apagados na
compilação. ~~`@/lib/calculos`~~ (⚠️ **apagado**), `@/lib/textos` e
`@/lib/avaliacoes` são permitidos
**somente como tipo** (`frontend-plan.md:603-605`).

**[FATO] Proibido importar** `@/lib/prisma`, `@/lib/http`, `@/generated/prisma/**`.

**[RISCO]** As 6 partes declaradas à mão não têm detecção automática de
divergência. Risco aceito e registrado; é a dúvida **D7** de `frontend-plan.md`
§12 (pedido de um tipo `RelatorioResponse` exportado), ainda sem resposta.

---

## 10. Tratamento de conteúdo provisório

**[FATO]** A resposta traz um objeto dedicado:

```json
"provisorio": {
  "curva":  "Velocidade derivada de tempo/repeticoes com deslocamento estimado",
  "score":  "Formula propria, sem validacao",
  "textos": "Lorem ipsum"
}
```

### Onde e como exibir

**[DECISÃO]** **Um único aviso**, logo abaixo do cabeçalho e **antes** dos cards
de resumo — o leitor precisa vê-lo antes de qualquer número.

- Renderizar os três itens **a partir da resposta**, nunca com texto fixo no
  código. Se o backend mudar ou remover um item, a tela acompanha sozinha.
- Rótulos dos itens: "Curva", "Score", "Textos"; o valor vem da API.
- Ao lado das seções afetadas (curva, análise técnica, score no card, e as quatro
  seções de texto), acrescentar um `Badge` discreto com a palavra
  **"Provisório"** — assim o aviso não fica só no topo, longe do número.

### Tom visual

**[DECISÃO]** Discreto e informativo, **não** alarmante: sem vermelho, sem ícone
de erro, sem borda grossa. Um bloco com fundo sutil e texto secundário. O
relatório precisa parecer profissional numa demonstração; um banner de alerta
gritante estragaria a impressão sem informar mais.

### Como evitar confusão do cliente

**[DECISÃO]** O aviso deve dizer, em texto próprio do front (este é o único texto
interpretativo que o front escreve, e ele fala **sobre** o dado, não sobre o
atleta):

> Esta é uma demonstração. As fórmulas e os textos abaixo ainda são provisórios e
> não representam a análise final.

Nada além disso. **Proibido** ao front: opinar sobre o desempenho do atleta,
sugerir treino, ou qualificar qualquer número.

### O que vem do backend e não pode ser reescrito

`textos.melhorias` · `textos.pontosAtencao` · `textos.recomendacoes` ·
`textos.conclusao` · `curva.perfil` · `score.nivel` · `provisorio.*` ·
`medidasDetalhadas[].sigla` e `.rotulo`.

Única transformação permitida: o **mapa de acentuação** de §5.7, restrito a
`perfil` e `nivel`, com fallback ao valor original.

---

## 11. Acessibilidade

### Headings e landmarks

- Um único `<h1>`: "Relatório de performance".
- `<h2>` por seção, na ordem de §5.1, sem saltos de nível.
- `<h3>` apenas dentro de "Recomendações", um por `foco`.
- Conteúdo em `<main>`; cabeçalho em `<header>`; rodapé em `<footer>`.

### Tabelas

- `<caption>` em todas (pode ser `sr-only`), descrevendo o conteúdo.
- `scope="col"` nos cabeçalhos de coluna; `scope="row"` na primeira célula de
  cada linha.
- Sigla com `<abbr title="...">` usando o `rotulo` que a API já fornece.
- Célula ausente sempre via `ValorOuAusente` — nunca um traço mudo.

### Ordem de leitura e foco

- Ordem do DOM = ordem visual = ordem de impressão, em qualquer viewport.
- Link de volta é o primeiro elemento focável.
- Foco visível em todos os links (fallback `outline-current`, §9.2).
- **Sem `aria-live`** — a página é estática.

### Contraste, zoom e limitações atuais

- **[FATO]** Os tokens da Nova seguem pendentes (`frontend-plan.md` §0.4): `Card`
  e `Badge` renderizam sem cor de fundo real. **Não tentar resolver** (§17).
- Não depender de cor para transmitir informação — o que, aqui, é reforçado pela
  proibição de cor semântica (§5.7).
- Zoom 200% / fonte ampliada: sem altura fixa em contêiner de texto; espaçamento
  por padding, conteúdo cresce.
- Nome do aluno e textos longos com `break-words`.

---

## 12. Preparação para impressão (sem implementar)

A E3 escreverá o CSS. A E2 entrega a **estrutura** que o torna simples.

### 12.1 Semântica

Cada seção é um `<section>` com `<h2>` associado — a unidade natural de quebra de
página. Nada de seções montadas com `<div>` solto.

### 12.2 Ganchos para o Print CSS

**[DECISÃO]** `RelatorioSecao` aplica em toda seção uma classe estável e
semanticamente neutra — **`relatorio-secao`** — que a E3 usará para
`break-inside: avoid`. Ela existe só como gancho; não carrega estilo de tela.

**[DECISÃO]** Elementos que a E3 vai esconder recebem a classe **`nao-imprimir`**
já na E2, sem nenhum efeito visual hoje: link de volta e (futuramente) qualquer
controle de tela.

### 12.3 Pontos de quebra

Cada uma das 10 seções de conteúdo é uma unidade candidata a quebra. Cards de
resumo e cabeçalho formam um bloco que deve permanecer na primeira página — a E3
decide como; a E2 só garante que estão em contêineres próprios e contíguos.

### 12.4 Não acoplar ao viewport

**[DECISÃO]** Proibido nos componentes do relatório: `useEffect` que mede
tamanho, `window.matchMedia`, renderização condicional por breakpoint que
**remova** conteúdo, altura fixa em px, e `overflow` que corte texto. Layout
responsivo só por CSS fluido (grid/flex + `max-width`). Isso é o que permite que
o mesmo DOM sirva tela e papel.

### 12.5 Sem botão de imprimir

Ver §6.4. A ação é da E3.

---

## 13. Critérios de aceite

### Navegação e rota

- [ ] Na ficha do aluno, a data de cada linha do histórico é link para o
      relatório daquela avaliação.
- [ ] O link é focável por teclado, com foco visível.
- [ ] `/avaliacoes/<id-valido>/relatorio` renderiza o relatório completo.
- [ ] `/avaliacoes/<uuid-inexistente>/relatorio` cai no `not-found.tsx` do segmento.
- [ ] `/avaliacoes/abc/relatorio` (malformado) **também** cai no `not-found`.
- [ ] O `not-found` tem link de volta.
- [ ] O link "← Ficha do aluno" leva a `/alunos/{aluno.id}`.

### Dados e contrato

- [ ] **Exatamente uma** chamada HTTP por carregamento (conferir no terminal do
      `npm run dev`).
- [ ] Nome, data da avaliação e período conferem com a resposta do endpoint
      (comparar com `curl`).
- [ ] Datas exibidas batem com as retornadas (`"2026-04-30"` → `30/04/2026`),
      sem deslocamento de fuso.
- [ ] Nenhum valor da resposta é recalculado no front.
- [ ] `inclinacao` exibe as 5 casas (`-0,01062`), não `-0,01`.
- [ ] `historicoCmj` e `curva.pontos` renderizados na ordem recebida.

### Nulo, zero e vazio

- [ ] Todo valor anulável passa por `ValorOuAusente`; nenhum `"—"` cru no código.
- [ ] `0` é exibido como `0`, nunca como `—`.
- [ ] `observacoes === null` → linha omitida, sem `—`.
- [ ] `ajuste === null` → "Análise técnica" mostra `EmptyState`, não tabela de traços.
- [ ] `resumoCmj === null` → "Resumo executivo" mostra `EmptyState`.
- [ ] `historicoCmj` vazio, `curva.pontos` vazio e textos vazios → `EmptyState`
      próprio, seção **presente**.

### Rotulagem e neutralidade

- [ ] `resumoCmj.atual` rotulado como "mais recente do histórico", nunca "atual".
- [ ] `periodo.totalAvaliacoes` rotulado como "avaliações com CMJ".
- [ ] Nenhuma cor, ícone ou seta sugere bom/ruim em score, perfil ou r².
- [ ] `r2` exibido como número 0-1, nunca como porcentagem ou adjetivo.
- [ ] Textos do backend renderizados sem alteração.
- [ ] Mapa de acentuação aplica-se a `perfil`/`nivel` e cai no valor original
      para chave desconhecida.

### Provisoriedade

- [ ] Aviso único, acima dos cards, com os três itens vindos da resposta.
- [ ] Badge "Provisório" nas seções de curva, análise técnica, score e textos.
- [ ] Tom discreto: sem vermelho, sem ícone de erro.

### Estados

- [ ] `loading.tsx` espelha a estrutura real, sem deslocamento perceptível.
- [ ] `error.tsx` mostra mensagem amigável e retry; sem stack trace, sem texto
      cru da API.

### Acessibilidade

- [ ] Um único `<h1>`; hierarquia sem saltos.
- [ ] Toda tabela com `<caption>` e `scope`.
- [ ] Siglas com `abbr`.
- [ ] Navegação completa por teclado com foco visível.

### Impressão (estrutura, sem CSS)

- [ ] Toda seção é `<section>` com `<h2>` e classe `relatorio-secao`.
- [ ] Link de volta tem classe `nao-imprimir`.
- [ ] Nenhum `useEffect` de medição, `matchMedia` ou altura fixa nos componentes
      do relatório.
- [ ] Ordem de leitura idêntica em mobile, tablet e desktop.

### Responsividade

- [ ] 360 px: sem rolagem horizontal na página.
- [ ] Cards em 1 coluna no mobile, 3 a partir de `sm`.
- [ ] Nome longo quebra em vez de estourar.

### Automático

- [ ] `npm run typecheck`, `npm run lint`, `npm run build` limpos.
- [ ] `/avaliacoes/[id]/relatorio` listada como `ƒ` (dinâmica) no build.
- [ ] Nenhum arquivo protegido alterado (§8).
- [ ] `package.json` / `package-lock.json` inalterados.

---

## 14. Casos de borda

### O que o seed cobre — e o que não cobre

**[FATO] Verificado em 31/07/2026** rodando o relatório das **16 avaliações** do
seed:

| Caso | No seed? |
| --- | --- |
| `observacoes === null` | ✅ **Sim** — só a avaliação mais recente de cada aluno tem texto |
| `perfil` | ❌ Sempre `"Equilibrado"` |
| `score.nivel` | ❌ Sempre `"Baixo"` (valores 52 a 54) |
| `ajuste === null` | ❌ Nunca — todas têm 5 pontos |
| `cargaMaximaKg === null` | ❌ Nunca |
| `historicoCmj` vazio | ❌ Nunca |
| `resumoCmj === null` | ❌ Nunca |
| medida `null` ou `0` | ❌ Nunca (144 valores, todos preenchidos) |
| textos vazios | ❌ Nunca |
| V3 (dados do futuro em relatório antigo) | ✅ **Sim** — usar a avaliação mais antiga |

### Método obrigatório para os casos ausentes

**[DECISÃO]** Mesma técnica já validada na E1: **alteração temporária,
mínima e reversível** no código da página, `curl` para conferir, **reversão
imediata**, e `git diff` conferido **antes** de cada validação e de cada commit.

**Proibido:** alterar o banco, rodar `db:seed`, `db:reset`, ou qualquer escrita
via API.

**Rodadas sugeridas** (agrupar para reduzir idas e vindas):

| Rodada | Forçar | Verificar |
| --- | --- | --- |
| A | `curva.ajuste = null`, `curva.cargaMaximaKg = null`, `curva.pontos = []` | `EmptyState` em curva e análise técnica; nada de tabela com traços |
| B | `resumoCmj = null`, `historicoCmj = []` | `EmptyState` em resumo executivo e histórico; card de CMJ com ausência tratada |
| C | `score = { valor: 0, nivel: "Sem dados" }` e depois `{ valor: 100, nivel: "Alto" }`; `curva.perfil = "Orientado a forca"` | extremos do score; **acentuação corrigida** para "Orientado a força" |
| D | `score.nivel = "Medio"` | exibe **"Médio"** |
| E | `textos = { melhorias: [], pontosAtencao: [], recomendacoes: [], conclusao: "" }` | `EmptyState` nas quatro seções de texto |
| F | uma medida `= null` e outra `= 0` em `medidasDetalhadas` | `—` acessível × `0` real |
| G | `score.nivel = "Rotulo Novo Inventado"` | fallback do mapa: exibe o valor cru, não some |
| H | *(sem alteração)* relatório da avaliação **mais antiga** de Ana Prado | V3: rótulos deixam claro que `atual`/`ate` são do histórico |

### Valores negativos e datas

- `variacaoVsPico` é **negativo no seed** (`-2.42`) — conferir sinal exibido.
- `inclinacao` é sempre negativa numa curva coerente; exibir o sinal.
- Datas de virada de mês/ano no `historicoCmj` — conferir que nenhuma recua um
  dia.

---

## 15. Plano de execução

Cinco unidades, implementáveis **numa única sessão**, sem aprovação entre elas.

### U1 — Rota, dados e tipos

**Objetivo.** Rota respondendo com dados reais, sem acabamento.
**Arquivos.** Criar `relatorio/page.tsx` (versão mínima: busca, 404, erro, imprime
nome e data), `features/relatorio/tipos.ts`, `features/relatorio/rotulos.ts`;
alterar `features/shared/formato.ts` (formatador com casas configuráveis).
**Validação.** `typecheck`, `lint`, `build`; `curl` em id válido, inexistente e
malformado; confirmar **uma única** chamada HTTP.

### U2 — Cabeçalho, aviso e cards

**Objetivo.** Topo do relatório completo.
**Arquivos.** Criar `RelatorioSecao`, `RelatorioCabecalho`, `AvisoProvisorio`,
`CardsResumo`; alterar `features/alunos/HistoricoAvaliacoes.tsx` (link);
compor em `page.tsx`.
**Validação.** `typecheck`, `lint`, `build`; navegar da ficha até o relatório.

### U3 — Curva, análise técnica e medidas

**Objetivo.** O núcleo numérico.
**Arquivos.** Criar `CurvaTabela`, `AnaliseTecnica`, `MedidasTabela`; compor.
**Validação.** Conferir os 6 valores do `ajuste` contra `curl`, com atenção às
5 casas da inclinação.

### U4 — Resumo de CMJ, histórico e textos

**Objetivo.** Fechar o conteúdo.
**Arquivos.** Criar `ResumoCmj`, `HistoricoCmjTabela`, `ListaTextos`,
`Recomendacoes`; compor.
**Validação.** Rotulagem de §5.6 conferida; textos idênticos aos da API.

### U5 — Estados, acessibilidade, responsividade e casos de borda

**Objetivo.** Fechar a etapa.
**Arquivos.** Criar `loading.tsx`, `error.tsx`, `not-found.tsx`; ajustes finais.
**Validação.** Rodadas A–H de §14; checklist inteiro de §13; `typecheck`, `lint`,
`build` finais.

---

## 16. Estratégia de commits

Um commit por unidade, Conventional Commits, mensagem em inglês (padrão do
repositório). **Sem aprovação entre commits; sem `push`, `merge`, `rebase` ou
troca de branch. Sem metadados de IA** (`Co-Authored-By`, `Claude-Session`).

| # | Mensagem sugerida |
| --- | --- |
| 1 | `feat(relatorio): add report route with data foundation and types` |
| 2 | `feat(relatorio): add report header, provisional notice and summary cards` |
| 3 | `feat(relatorio): add force-velocity curve, technical analysis and measures` |
| 4 | `feat(relatorio): add CMJ summary, history and backend-provided texts` |
| 5 | `feat(relatorio): add report states, accessibility and responsiveness` |

Rodar `typecheck` e `lint` antes de cada commit; `build` em toda unidade que
toque rota, fronteira de renderização ou integração — na prática, todas.

---

## 17. Autonomia

### Pode decidir sozinho

Nomes de variáveis, funções e componentes · organização interna dos arquivos ·
classes Tailwind, espaçamentos e tamanhos · composição e divisão de
subcomponentes · textos auxiliares de interface em português (rótulos de coluna,
mensagens de estado vazio) · melhorias de acessibilidade além do exigido ·
refactors locais nos arquivos que já está tocando · divisão exata dos commits ·
escolha entre `abbr`, `title` ou `aria-label`.

### Deve parar e reportar

1. Necessidade de alterar `prisma/**`, `src/app/api/**` ou `src/lib/**`.
2. Necessidade de qualquer dependência nova.
3. Contrato real divergente do documentado em §3.
4. Campo indispensável ausente na resposta.
5. Mudança de arquitetura (Server/Client, consumo de API, feature-first).
6. Conflito real com `docs/frontend-plan.md`.
7. Requisito de produto indefinido que bloqueie.
8. Falha de `typecheck`/`lint`/`build` sem correção local segura.
9. Qualquer risco a dados (escrita, `db:seed`, `db:reset`).
10. Necessidade de resolver os tokens da Nova — **fora de escopo permanente** nesta etapa.
11. Necessidade real de gráfico ou PDF para cumprir um requisito da E2.

Ao parar: descrever o achado, apresentar evidência (caminho/linha ou saída de
comando), propor alternativas, aguardar decisão. Não contornar por conta própria.

---

## 18. Protocolo de execução

1. Ler este documento inteiro antes de escrever qualquer linha.
2. Reler `docs/frontend-plan.md` e `docs/api.md` (autoridade acima desta spec).
3. Implementar U1 → U5, na ordem.
4. `typecheck` e `lint` ao fim de cada unidade; `build` em todas.
5. Testar o que o seed cobre; usar a técnica reversível de §14 para o resto, com
   `git diff` conferido antes de cada commit.
6. Commitar por unidade. Sem `push`. Não avançar para a E3.
7. Relatório final: resumo, arquivos criados/alterados, commits com hash,
   resultados de validação, testes executados **e os não executados**, decisões
   tomadas dentro da autonomia, divergências encontradas, pendências.

**Honestidade de relatório:** o que não foi verificado deve ser declarado como não
verificado. Não afirmar confirmação visual sem tê-la feito.

---

## Apêndice — riscos herdados

| Risco | Origem | Efeito na E2 |
| --- | --- | --- |
| Tokens da Nova pendentes | `frontend-plan.md` §0.4 | `Card` e `Badge` sem cor de fundo real. Conviver |
| R2 — volatilidade do relatório | `frontend-plan.md` §11 | Curva, score e textos vão mudar. Mitigado por componentes agnósticos ao valor |
| R6/V3 — período e resumo do histórico inteiro | §3.6 | **Maior risco desta etapa.** Mitigado por rotulagem obrigatória (§5.6) |
| R3 — contrato de saída não tipado | `frontend-plan.md` §11 | 6 partes declaradas à mão (§9.7); pedido D7 segue aberto |
| B2 — seções do relatório indefinidas | `frontend-plan.md` §12 | "Evolução da curva" e Pmáx não entram; a API não os tem |
| Ferramenta de navegador indisponível | sessões E0/E1 | Verificação visual real pode não ser possível; declarar no relatório |
