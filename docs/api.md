# API — contrato pro front

Estado: **MVP de demonstração.** Serve pra montar as telas e mostrar pro
professor. Fórmulas e textos do relatório são provisórios — ver
[o que é provisório](#o-que-é-provisório).

Base local: `http://localhost:3000/api`

## 🆕 Avaliação v2 — o contrato mudou

As rotas de avaliação passaram para o **modelo v2**
(`docs/evaluation-model-v2-proposal.md`). É **breaking change deliberado, sem
versionamento paralelo**: não existe cliente em produção, e manter os dois
formatos custaria mais do que trocar.

| Saiu | Entrou |
| --- | --- |
| `medidas` (5 chaves, com `unidade`) | `amplitude` (4) + `saltos` (5), sem unidade |
| `testes[]` com `tentativas[]` | `velocidade`, 2 chaves fixas |
| `ordem`, `repeticoes` | — (o professor registra o melhor resultado, não a série) |
| `unidade` no payload | unidade só no catálogo (`GET /medidas`) |
| `409` por código duplicado | — (duplicidade virou impossível) |

O schema Zod oficial é `criarAvaliacaoSchema` em `src/lib/schemas.ts`. Ele é a
versão revisada de `schemaAvaliacaoV2Provisorio`, que o front escreveu em
`src/features/avaliacoes/contrato-v2.ts`: **a forma foi aceita sem alteração** —
mesmos nomes de chave, mesma nullabilidade, mesmos paths de erro. Com isto
publicado, `contrato-v2.ts` cumpriu seu prazo de vida e deve ser apagado
(`e5-v2-implementation-spec.md` §13.5).

Duas coisas continuam **pendentes de decisão**, e estão marcadas onde aparecem:

- **unidade dos 4 saltos novos** — vem `null` no catálogo, e não bloqueia o
  contrato, porque o v2 não transporta unidade;
- **futuro da curva força-velocidade**, que caiu de 8 para no máximo 2 pontos
  — ver [a seção sobre isso](#️-a-curva-encolheu-de-8-pontos-para-2--decisão-de-produto-pendente).

## Tipos

Os tipos podem ser importados direto — **entrada e saída**:

```ts
import type {
  CriarAvaliacaoDTO,
  AtualizarAvaliacaoDTO,
  CriarAlunoDTO,
} from "@/lib/schemas";
import type { AvaliacaoResponse } from "@/lib/avaliacoes";
import type { RelatorioResponse } from "@/lib/relatorio";
```

Nenhum dos dois é declaração paralela: os de entrada saem dos schemas Zod, o
de saída sai da função que monta a resposta. Formato e implementação não têm
como divergir em silêncio.

## Códigos de resposta

`200` ok · `201` criado · `204` sem conteúdo · `400` JSON inválido ·
`404` não encontrado · `409` conflito · `500` erro interno.

`422` é validação, e vem com os campos que falharam:

```json
{
  "error": "Dados invalidos",
  "issues": [{ "field": "alunoId", "message": "alunoId precisa ser um UUID" }]
}
```

## Catálogo de medidas

`GET /medidas` devolve a lista de medidas com código, sigla da planilha e rótulo.
Estático, não consulta o banco — dá pra buscar uma vez e cachear.

**Use isso em vez de chumbar rótulo no front.** As siglas (`SLB ESQ`, `TOR DIR`)
são o vocabulário do professor: é por elas que ele reconhece a medida no
relatório, então elas precisam bater com a planilha dele.

```jsonc
{
  "sufixoLado": { "direito": "DIR", "esquerdo": "ESQ" },
  "medidas": [
    {
      "chave": "tornozelo",                 // chave dentro de `amplitude` no DTO
      "codigo": "MOBILIDADE_TORNOZELO",
      "sigla": "TOR",
      "nome": "Mobilidade de tornozelo",
      "unidade": "cm",
      "bilateral": true,
      "bloco": "amplitude",
      "siglas": { "direito": "TOR DIR", "esquerdo": "TOR ESQ" }
    },
    {
      "chave": "cmj",                       // chave dentro de `saltos` no DTO
      "codigo": "CMJ",
      "sigla": "CMJ",
      "nome": "Counter Movement Jump",
      "unidade": "cm",
      "bilateral": false,
      "bloco": "salto",
      "siglas": { "valor": "CMJ" }          // medida simples: sem lado
    },
    {
      "chave": "salto2",
      "codigo": "SALTO_2",
      "sigla": "SALTO 2",
      "nome": "Resultado de salto 2",
      "unidade": null,                      // ⚠️ desconhecida — ver abaixo
      "bilateral": false,
      "bloco": "salto",
      "siglas": { "valor": "SALTO 2" }
    }
  ],
  "velocidade": [                           // não sai de `medidas`: duas grandezas
    {
      "chave": "squatJump",                 // chave dentro de `velocidade` no DTO
      "codigo": "SQUAT_JUMP",
      "nome": "Squat Jump",
      "unidades": { "carga": "kg", "tempo": "s" }
    }
  ]
}
```

Dá pra montar o formulário inteiro a partir daqui: `bloco` decide em qual dos
três fieldsets o campo entra, `bilateral` decide se são dois campos ou um, e
`chave` diz onde o valor entra no DTO.

⚠️ **`unidade` pode vir `null`**, nos quatro saltos provisórios. Significa
"unidade ainda não confirmada pelo cliente", não "sem unidade". Renderize o
número **sem sufixo** nesse caso — nunca assuma `cm`. Nome, sigla e código
desses quatro também são provisórios e vão mudar quando o cliente responder.

> Fonte única: `src/lib/medidas.ts`. Acrescentar medida é uma entrada lá + o
> campo no bloco correspondente de `src/lib/schemas.ts`; se esquecer a segunda
> parte, o `npm run typecheck` quebra de propósito.

## Alunos

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/medidas` | catálogo de medidas (estático) |
| `GET` | `/alunos?ativo=true&busca=ana` | lista alunos com `totalAvaliacoes` |
| `POST` | `/alunos` | cria aluno |
| `GET` | `/alunos/:id` | aluno + lista resumida das avaliações |
| `PATCH` | `/alunos/:id` | atualiza (campos parciais) |
| `DELETE` | `/alunos/:id` | remove (cascata nas avaliações) |

```jsonc
// POST /alunos
{ "nome": "Ana Prado", "dataNascimento": "1998-03-14" }  // dataNascimento opcional
```

No `PATCH`, `dataNascimento` tem três comportamentos distintos:

| Payload | Efeito |
| --- | --- |
| chave ausente | mantém o valor atual |
| `"dataNascimento": null` | **limpa** o campo |
| `"dataNascimento": "1998-03-14"` | troca o valor |

## Avaliações

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/avaliacoes?alunoId=<uuid>&limite=50` | lista, mais recente primeiro |
| `POST` | `/avaliacoes` | cria — recebe o `CriarAvaliacaoDTO` |
| `GET` | `/avaliacoes/:id` | avaliação completa |
| `PATCH` | `/avaliacoes/:id` | edita — recebe o `AtualizarAvaliacaoDTO` |
| `DELETE` | `/avaliacoes/:id` | remove |
| `GET` | `/avaliacoes/:id/relatorio` | dados do relatório de performance |

O que `GET /avaliacoes` e `GET /avaliacoes/:id` devolvem tem tipo pronto:

```ts
import type {
  AvaliacaoResponse,     // a avaliação inteira
  VelocidadeResponse,    // o bloco de velocidade
  ExercicioResponse,     // um exercício dele
} from "@/lib/avaliacoes";
```

Derivado do serializador real, igual ao `RelatorioResponse` — não precisa mais
de `ReturnType<typeof serializarAvaliacao>`. Importar é seguro: o módulo não
toca `@/lib/prisma` nem `@/lib/http`, e nenhum `Date` sobrevive até a resposta,
então o tipo vale igual antes e depois do JSON.

### `POST /avaliacoes`

Recebe exatamente o formato combinado. `GET /avaliacoes/:id` devolve o mesmo
formato de volta, mais `id`, `alunoNome` e `criadoEm` — round-trip garantido.

```jsonc
{
  "alunoId": "8d1f5b89-90cb-4b61-a4c8-1e6ef7f71d67",  // uuid, precisa existir
  "dataAvaliacao": "2026-07-30",                       // AAAA-MM-DD
  "amplitude": {
    "tornozelo":     { "direito": 11.5, "esquerdo": 12.1 },
    "quadril":       { "direito": 18.4, "esquerdo": 17.8 },
    "isquiotibiais": { "direito": 21,   "esquerdo": 20.7 },
    "slb":           { "direito": 32.5, "esquerdo": 31.9 }
  },
  "saltos": {
    "cmj": 42.8, "salto2": 38.1, "salto3": 35, "salto4": 30.2, "salto5": 28.9
  },
  "velocidade": {
    "squatJump":   { "cargaKg": 20, "tempoSegundos": 1.43 },
    "agachamento": { "cargaKg": 60, "tempoSegundos": 1.91 }
  },
  "observacoes": "Boa evolução na mobilidade."  // opcional
}
```

**Nenhuma unidade trafega no payload.** Unidade é propriedade do catálogo
(`GET /medidas`), não do dado: o professor não escolhe em que unidade mede o
tornozelo. É o que permite os quatro saltos novos existirem antes de o cliente
dizer qual é a unidade deles.

Regras de validação relevantes:

- **Todos os valores aceitam `null`, e todas as chaves são obrigatórias.**
  Avaliação parcial é a norma; chave ausente não é. `null` significa "não
  medido"; `0` significa "medido e deu zero". Os dois nunca se misturam.
- Medidas aceitam `0` e rejeitam negativo.
- `cargaKg` aceita **`0`** — Squat Jump sem carga externa (peso corporal) é
  medição legítima, e o ponto `(0, v)` é o intercepto V0 medido. Mudou em
  relação ao v1, que rejeitava.
- `tempoSegundos` precisa ser **estritamente positivo**: zero seria divisão por
  zero no cálculo de velocidade.
- **Carga e tempo são mutuamente dependentes**: por exercício, ou os dois
  preenchidos, ou os dois `null`. Meio par é recusado com `422`.
- `409` **não é mais alcançável** neste fluxo: os códigos vêm do catálogo, não
  do cliente, então duplicidade virou sintaticamente impossível.

#### `issues[].field` — lista literal

O front usa o `name` de cada input idêntico ao `field` do issue, sem tabela de
tradução. A lista completa, fixada por teste em `src/lib/schemas.test.ts`:

```
alunoId
dataAvaliacao
observacoes
amplitude.tornozelo.direito        amplitude.tornozelo.esquerdo
amplitude.quadril.direito          amplitude.quadril.esquerdo
amplitude.isquiotibiais.direito    amplitude.isquiotibiais.esquerdo
amplitude.slb.direito              amplitude.slb.esquerdo
saltos.cmj    saltos.salto2    saltos.salto3    saltos.salto4    saltos.salto5
velocidade.squatJump.cargaKg       velocidade.squatJump.tempoSegundos
velocidade.agachamento.cargaKg     velocidade.agachamento.tempoSegundos
```

19 campos, nenhum índice numérico. Os dois paths da regra carga↔tempo saem do
`superRefine` e foram **verificados contra o servidor real**, não deduzidos:

```json
{
  "error": "Dados invalidos",
  "issues": [
    { "field": "velocidade.squatJump.tempoSegundos", "message": "Informe o tempo junto com a carga." },
    { "field": "velocidade.agachamento.cargaKg", "message": "Informe a carga junto com o tempo." }
  ]
}
```

### `PATCH /avaliacoes/:id`

Edita uma avaliação existente. Devolve `200` com a avaliação completa, no mesmo
formato do `GET`.

**Cada bloco enviado substitui o bloco inteiro; bloco omitido fica como estava.**
Não existe atualizar uma medida sozinha — o mesmo motivo que faz todas as chaves
estarem sempre presentes: merge parcial reabriria a dúvida entre "não mandei" e
"apaguei".

| Campo | Omitido | Enviado |
| --- | --- | --- |
| `dataAvaliacao` | mantém | troca |
| `amplitude` | mantém as 4 | substitui as 4 |
| `saltos` | mantém os 5 | substitui os 5 |
| `velocidade` | mantém os 2 | substitui os 2 |
| `observacoes` | mantém | texto troca · **`null` limpa** |

Os três blocos são independentes: mandar `saltos` sozinho **não** apaga
`amplitude`, mesmo os dois morando na mesma tabela.

`alunoId` não é aceito: avaliação não muda de aluno. Se precisar, `DELETE` e
`POST` de novo.

Corpo vazio (`{}`) é válido e não muda nada — devolve o estado atual.

```jsonc
// só corrigir a observação, sem tocar em nenhum bloco
{ "observacoes": "Refez o CMJ, valor conferido." }

// limpar a observação
{ "observacoes": null }
```

Erros: `404` id inexistente · `422` payload inválido, com `issues[].field` no
mesmo formato do `POST`. Um bloco enviado continua exigindo **todas** as suas
chaves, e a regra carga↔tempo vale igual.

A gravação é transacional: se a recriação falhar, o conteúdo antigo continua
lá — um payload recusado não deixa a avaliação vazia.

## `GET /avaliacoes/:id/relatorio`

Tudo que o relatório precisa, numa chamada.

### Janela de período — `?semanas=`

| Chamada | Cobertura |
| --- | --- |
| `/avaliacoes/:id/relatorio` | **histórico inteiro do aluno** (default) |
| `/avaliacoes/:id/relatorio?semanas=8` | as 8 semanas que terminam na data da avaliação relatada |

`semanas` é inteiro entre 1 e 520; fora disso é 422. **Não tem default de
propósito** — sem o parâmetro nada muda em relação ao comportamento anterior,
para nenhum relatório já existente passar a mostrar números diferentes em
silêncio.

O recorte afeta `historicoCmj`, `resumoCmj` e `periodo`. **Não afeta `curva`
nem `score`**, que saem da própria avaliação relatada, não do histórico.

`periodo.semanas` diz qual janela foi aplicada, ou `null` quando é o histórico
inteiro — use isso para rotular a tela, em vez de assumir o que os números
significam. Atenção: `periodo.de`/`ate` continuam sendo os extremos do **dado
que existe**, não as bordas da janela pedida (a janela pode começar antes do
primeiro registro do aluno).

Resposta abreviada:

```jsonc
{
  "aluno":   { "id": "...", "nome": "Ana Prado" },
  "avaliacao": { "id": "...", "dataAvaliacao": "2026-07-30", "observacoes": "..." },
  // ⚠️ totalAvaliacoes conta só avaliações COM CMJ — ver notas abaixo
  // semanas: janela aplicada, ou null quando cobre o histórico inteiro
  "periodo": { "de": "2025-07-10", "ate": "2026-07-30",
               "totalAvaliacoes": 9, "semanas": null },

  // os mesmos blocos do DTO
  "amplitude": { /* ... */ },
  "saltos":    { /* ... */ },

  // mesmo conteúdo, achatado e com a sigla do professor pronta pra imprimir
  "medidasDetalhadas": [
    {
      "chave": "slb", "codigo": "SLB", "sigla": "SLB", "nome": "SLB",
      "unidade": "cm", "bilateral": true, "bloco": "amplitude",
      "valores": [
        { "sigla": "SLB DIR", "rotulo": "SLB (direito)",  "lado": "direito",  "valor": 32.5 },
        { "sigla": "SLB ESQ", "rotulo": "SLB (esquerdo)", "lado": "esquerdo", "valor": 31.9 }
      ]
    }
  ],

  "curva": {
    "pontos": [
      { "testeCodigo": "SQUAT_JUMP", "testeNome": "Squat Jump",
        "cargaKg": 20, "velocidadeMs": 0.379 }
      // ...ordenados por carga crescente. NO MÁXIMO 2 — ver abaixo
    ],
    "cargaMaximaKg": 60,       // pode vir null — ver notas abaixo
    "ajuste": {
      "inclinacao": -0.00243,   // m/s por kg
      "v0": 0.428,              // velocidade teórica máxima
      "f0": 176.3,              // carga teórica máxima
      "r2": 1,                  // ⚠️ com 2 pontos é sempre 1 — ver abaixo
      "pontosUsados": 2,
      "cargaOtimaKg": 88.1,
      "velocidadeOtimaMs": 0.214
    },
    "perfil": "Orientado a força",
    "suficiencia": {
      "pontos": 2,
      "temAjuste": true,
      "r2Informativo": false    // não exiba r2 como qualidade quando for false
    }
  },

  "historicoCmj": [ { "data": "2025-07-10", "valor": 40 } ],
  "resumoCmj": {
    "inicial": { "data": "...", "valor": 40 },
    "pico":    { "data": "...", "valor": 45.95 },
    "atual":   { "data": "...", "valor": 42.8 },
    "variacaoVsInicial": 2.8,
    "variacaoVsPico": -3.15
  },

  "score":  { "valor": 50, "nivel": "Baixo" },
  "textos": { "melhorias": [], "pontosAtencao": [], "recomendacoes": [], "conclusao": "" },

  "provisorio": { "curva": "...", "score": "...", "textos": "..." }
}
```

**O tipo da resposta é exportado.** Em vez de espelhar o formato à mão:

```ts
import type { RelatorioResponse } from "@/lib/relatorio";
```

Também saem de lá `PontoCmj` e `ResumoCmjRelatorio`. O tipo é **derivado** da
função que monta a resposta (`ReturnType<typeof montarRelatorio>`), não
declarado à parte — então não tem como o contrato e a implementação
divergirem em silêncio: mudou o formato, o `typecheck` acusa em quem consome.

`src/lib/relatorio.ts` não importa `@/lib/prisma` nem `@/lib/http` de
propósito — quem vai ao banco é o route handler. Dá pra fazer `import type`
do front sem arrastar módulo server-only.

### ⚠️ A curva encolheu de 8 pontos para 2 — decisão de produto pendente

> Atenção à sigla: este é o bloqueio **B2 de
> `evaluation-model-v2-proposal.md` §20**, que não é o mesmo B2 da tabela de
> pendências no fim deste arquivo.

No modelo v1 a curva somava uma tentativa por ponto: o seed dava 5 e a planilha
real do professor tem 8. **No v2 sobra no máximo 1 ponto por exercício, ou
seja 2 no total.** Consequências, todas verificáveis na resposta:

| Situação | O que acontece |
| --- | --- |
| 2 exercícios medidos | há reta, mas `r2` é **sempre `1`** |
| 1 exercício medido | `ajuste: null`, `perfil: "Dados insuficientes"` |
| cargas iguais nos 2 | `ajuste: null` (regressão sem solução) |

O `r2 = 1` **não é ajuste perfeito** — é ausência de graus de liberdade: uma
reta passa exatamente por dois pontos, por construção. Exibir isso como "índice
de qualidade da curva" apresentaria uma constante como se fosse informação.

Por isso a resposta traz `curva.suficiencia`. **Use `r2Informativo` para decidir
se exibe `r2`**, em vez de deduzir de `pontos.length` em cada componente.

Isto é uma adaptação mecânica para a rota continuar funcionando e não mentir —
**não é a resposta ao bloqueio**. As seções 2, 3, 4, 7 e 10 do relatório foram
desenhadas sobre 8 pontos e não se sustentam com 2. Se a curva continua no
produto, vira comparação de dois pontos, ou sai do MVP, é decisão de produto,
ainda pendente (`evaluation-model-v2-proposal.md` §9.4, §15.8).

Notas pro front:

- **`ajuste` pode vir `null`** — acontece com menos de 2 pontos de carga, ou se
  as duas cargas forem iguais. Nesse caso `perfil` vem `"Dados insuficientes"`.
- **`resumoCmj` pode vir `null`** se o aluno nunca teve CMJ medido.
- **`curva.cargaMaximaKg` pode vir `null`** quando nenhum exercício de
  velocidade foi medido.
- **`medidasDetalhadas[].unidade` pode vir `null`** — os quatro saltos
  provisórios. Imprima o valor sem sufixo, nunca assuma `cm`.
- Exercício com carga ou tempo faltando **fica fora da curva** em vez de virar
  zero, mesma regra do CMJ ausente no histórico.
- `historicoCmj` **pula** avaliações sem CMJ em vez de mandar zero (era um bug
  conhecido da planilha, ver `planilha-atual.md`).
- **`periodo.totalAvaliacoes` conta só as avaliações com CMJ**, não o total de
  avaliações do aluno — é o tamanho de `historicoCmj`. Não rotular na tela como
  "total de avaliações".
- **`periodo` e `resumoCmj` cobrem o histórico inteiro do aluno** por default,
  não a avaliação relatada — use `?semanas=` para recortar, e `periodo.semanas`
  para rotular. `score` e `curva` sempre saem da avaliação relatada.
- `perfil` e `nivel` vêm **acentuados** e prontos pra exibição; o front não
  precisa traduzir nem corrigir. Valores possíveis: `perfil` ∈ {`Orientado a
  força`, `Equilibrado`, `Orientado a velocidade`, `Dados insuficientes`};
  `nivel` ∈ {`Alto`, `Médio`, `Baixo`, `Inicial`, `Sem dados`}.
- O objeto `provisorio` descreve, em texto, o que ainda não é real. Dá pra usar
  como tooltip/aviso na tela durante a demo — e sumir com ele depois.

## O que é provisório

Nada disso é opinião do professor ainda. Está tudo isolado em dois arquivos:

| Arquivo | O que tem | Por quê |
| --- | --- | --- |
| `src/lib/calculos.ts` | velocidade, curva, perfil, score | as fórmulas reais estão na planilha do professor e ainda não chegaram |
| `src/lib/textos.ts` | melhorias, pontos de atenção, recomendações, conclusão | lorem ipsum; ainda não se sabe se ele escreve ou se o sistema gera |

O ponto mais frágil: **o contrato manda `tempoSegundos`, não velocidade.** Pra
virar m/s falta o deslocamento do movimento, que hoje é uma constante chutada
(0,5 m) em `DESLOCAMENTO_POR_CODIGO`. Os números saem na ordem certa (mais carga
→ mais lento), mas a escala não bate com a VMP que o professor usa hoje. Está na
lista de dúvidas como a nº 11.

⚠️ **Isso piorou no v2.** A fórmula era `repeticoes × deslocamento / tempo`; sem
`repeticoes`, virou `deslocamento / tempo`, e o numerador passou a ser
inteiramente estimativa nossa. Some a isso o fato de o `docs/vbt.md` registrar
que o professor **já mede VMP com encoder**: se ele tem a velocidade na mão,
receber `velocidadeMs` em vez de `tempoSegundos` eliminaria de uma vez o chute
do deslocamento, a dúvida 11 e toda a derivação. Vale perguntar antes de o
front seguir — trocar o campo depois muda o DTO
(`evaluation-model-v2-proposal.md` §12, §15.6).

## Pendências levantadas pelo front

Resposta do backend às perguntas de `frontend-plan.md` §12. O que está
**resolvido** já está implementado e documentado acima.

| # | Pergunta | Situação |
| --- | --- | --- |
| B1 | período de 8 semanas | **resolvido** — `?semanas=`, opt-in, default inalterado |
| D3 | `PATCH` não limpava `dataNascimento` | **resolvido** — schema virou `.nullish()` |
| D4 | `perfil`/`nivel` viriam acentuados? | **resolvido** — sim, prontos pra exibir |
| D6 | o front pode importar `MEDIDAS` de `@/lib/medidas`? | **sim** — o módulo não tem nenhum import, é catálogo estático e fonte única da verdade. `GET /medidas` existe pra quem preferir buscar |
| D7 | exportar `RelatorioResponse` | **resolvido** — derivado, em `@/lib/relatorio` |
| R3 | contrato de saída de avaliação não tipado | **resolvido** — `AvaliacaoResponse`, `VelocidadeResponse` e `ExercicioResponse` em `@/lib/avaliacoes`. Dá pra trocar o `ReturnType<typeof serializarAvaliacao>` de `features/alunos/tipos.ts:35` pelo import direto |
| B6 | unidade dos 4 saltos novos | **destravado, não resolvido** — o contrato não transporta unidade, então o front não depende disso. No catálogo vem `null` até o cliente responder; código, sigla e nome dos quatro também são provisórios |
| D1 | recortar até a data da avaliação relatada | **parcial** — com `?semanas=` a janela termina nela; sem o parâmetro, ainda cobre tudo |
| D8 | service layer em `src/lib/` | **começou** — `relatorio.ts` é o primeiro caso; sem plano de estender ainda |
| D2 | `totalAvaliacoes` contar só CMJ é intencional? | **aberto** — comportamento documentado, mas a escolha é de produto |
| D5 | `POST`/`PATCH /alunos` devolverem `totalAvaliacoes` | **aberto** — não implementado |
| B2 | seções do relatório que a API não entrega | **aberto** — depende das fórmulas reais |
| B3 | o que significa compartilhar | **aberto** — decisão de produto |
| B4 | filiais entram no MVP? | **aberto** — não existem no schema |
| B5 | o MVP edita avaliação? | **resolvido** — `PATCH /avaliacoes/:id`, bloco a bloco. Fecha a última divergência do R6 |

## Rodando

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed     # 3 alunos com histórico fictício
npm run dev
```

O seed apaga os alunos existentes e recria — ele existe pra ter tela cheia, não
pra preservar dado.
