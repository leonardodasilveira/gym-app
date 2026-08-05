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

Dos dois bloqueios que a proposta levantou, **um foi decidido e o outro deixou
de bloquear**:

- **curva força-velocidade** — decidido em 05/08/2026:
  [saiu do relatório](#-a-curva-força-velocidade-saiu-do-relatório), junto com
  perfil e score;
- **unidade dos 4 saltos novos** — segue sem resposta do cliente, mas **não
  bloqueia nada**: o v2 não transporta unidade, então ela vive só no catálogo,
  onde vem `null` até alguém confirmar.

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

O recorte afeta `historicoCmj`, `resumoCmj` e `periodo`. **Não afeta
`velocidade`**, que sai da própria avaliação relatada, não do histórico.

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

  // carga e tempo como o professor digitou — sem derivação
  "velocidade": {
    "squatJump":   { "cargaKg": 20, "tempoSegundos": 1.43 },
    "agachamento": { "cargaKg": 60, "tempoSegundos": 1.91 }
  },
  "velocidadeDetalhada": [
    { "codigo": "SQUAT_JUMP",  "nome": "Squat Jump",  "cargaKg": 20, "tempoSegundos": 1.43 },
    { "codigo": "AGACHAMENTO", "nome": "Agachamento", "cargaKg": 60, "tempoSegundos": 1.91 }
  ],

  "historicoCmj": [ { "data": "2025-07-10", "valor": 40 } ],
  "resumoCmj": {
    "inicial": { "data": "...", "valor": 40 },
    "pico":    { "data": "...", "valor": 45.95 },
    "atual":   { "data": "...", "valor": 42.8 },
    "variacaoVsInicial": 2.8,
    "variacaoVsPico": -3.15
  },

  "textos": { "melhorias": [], "pontosAtencao": [], "recomendacoes": [], "conclusao": "" },

  "provisorio": { "textos": "Lorem ipsum" }
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

### 🚫 A curva força-velocidade saiu do relatório

**Decisão de produto de 05/08/2026.** A resposta **não tem mais** `curva`,
`ajuste`, `perfil`, `score` nem `provisorio.curva`/`provisorio.score`.

Motivo: o modelo v2 reduziu a curva de 8 pontos (planilha real do professor)
para no máximo 2 — um por exercício. Com 2 pontos a reta é exata por
construção, `r2` daria `1` sempre, e perfil e score viravam função de duas
medições. As seções 2, 3, 4, 7 e 10 do relatório foram desenhadas sobre 8
pontos e não se sustentavam.

No lugar entra o dado **medido**, sem nenhuma derivação:

```jsonc
"velocidade": {                          // mesmo formato do DTO
  "squatJump":   { "cargaKg": 20, "tempoSegundos": 1.43 },
  "agachamento": { "cargaKg": 60, "tempoSegundos": 1.91 }
},
"velocidadeDetalhada": [                 // com o nome pronto pra imprimir
  { "codigo": "SQUAT_JUMP",  "nome": "Squat Jump",  "cargaKg": 20, "tempoSegundos": 1.43 },
  { "codigo": "AGACHAMENTO", "nome": "Agachamento", "cargaKg": 60, "tempoSegundos": 1.91 }
]
```

Exercício não medido **continua aparecendo**, com os dois valores `null` — a
tabela do relatório não muda de tamanho conforme o preenchimento.

Sumiu junto a velocidade em m/s derivada de um deslocamento chutado (0,5 m).
Era o número mais frágil da resposta: no v2 ele teria virado estimativa pura,
já que a fórmula perdeu o termo `repeticoes`. O relatório agora publica o tempo
cronometrado, que é o que existe de fato.

> `tempoSegundos` fica em segundos por ora, para a demo. Se o professor
> confirmar que já tem a VMP do encoder, o campo pode virar velocidade — ver
> [o que é provisório](#o-que-é-provisório).

Notas pro front:

- **`resumoCmj` pode vir `null`** se o aluno nunca teve CMJ medido.
- **`cargaKg` e `tempoSegundos` podem vir `null`** — exercício não medido.
- **`medidasDetalhadas[].unidade` pode vir `null`** — os quatro saltos
  provisórios. Imprima o valor sem sufixo, nunca assuma `cm`.
- `historicoCmj` **pula** avaliações sem CMJ em vez de mandar zero (era um bug
  conhecido da planilha, ver `planilha-atual.md`).
- **`periodo.totalAvaliacoes` conta só as avaliações com CMJ**, não o total de
  avaliações do aluno — é o tamanho de `historicoCmj`. Não rotular na tela como
  "total de avaliações".
- **`periodo` e `resumoCmj` cobrem o histórico inteiro do aluno** por default,
  não a avaliação relatada — use `?semanas=` para recortar, e `periodo.semanas`
  para rotular. `velocidade` sempre sai da avaliação relatada.
- O objeto `provisorio` descreve, em texto, o que ainda não é real. Dá pra usar
  como tooltip/aviso na tela durante a demo — e sumir com ele depois.

## O que é provisório

Sobrou **um** arquivo. Os números derivados saíram todos do produto em
05/08/2026, junto com a curva:

| Arquivo | O que tem | Por quê |
| --- | --- | --- |
| `src/lib/textos.ts` | melhorias, pontos de atenção, recomendações, conclusão | lorem ipsum; ainda não se sabe se o professor escreve ou se o sistema gera |

`src/lib/calculos.ts` **não existe mais.** Ele continha a regressão da curva,
o perfil, o score e a conversão de tempo em velocidade — tudo declaradamente
chutado, e tudo sem consumidor depois que a curva saiu do relatório. A API não
publica mais nenhum número que ela própria tenha inventado: só o que o professor
digitou.

O que sobrevive dessa investigação está em `src/lib/__fixtures__/planilha.ts`:
os 8 pontos reais transcritos das fotos da planilha, os valores que o relatório
do professor publica, e o registro do **"buraco"** — a regressão sobre aqueles
8 pontos dá F0 144,5, o relatório dele publica 122,1, e os próprios números dele
não fecham entre si (pela definição de F0, seria 188). Isso não é código de
produto, é evidência do cliente: se as fórmulas reais chegarem no `.xlsx`, é o
alvo contra o qual medir.

### Ainda em aberto: tempo ou velocidade?

O contrato manda `tempoSegundos`. Ficou assim **para a demo**, por decisão de
05/08/2026 — "qualquer coisa a gente muda depois". Mas o `docs/vbt.md` registra
que o professor **já mede VMP com encoder**: se ele tem a velocidade na mão,
receber `velocidadeMs` seria mais direto e eliminaria a dúvida 11 (amplitude do
movimento) de uma vez. Trocar depois muda o DTO
(`evaluation-model-v2-proposal.md` §12, §15.6).

## Pendências levantadas pelo front

Resposta do backend às perguntas de `frontend-plan.md` §12. O que está
**resolvido** já está implementado e documentado acima.

| # | Pergunta | Situação |
| --- | --- | --- |
| B1 | período de 8 semanas | **resolvido** — `?semanas=`, opt-in, default inalterado |
| D3 | `PATCH` não limpava `dataNascimento` | **resolvido** — schema virou `.nullish()` |
| D4 | `perfil`/`nivel` viriam acentuados? | **obsoleto** — perfil e score saíram do relatório em 05/08/2026 |
| D6 | o front pode importar `MEDIDAS` de `@/lib/medidas`? | **sim** — o módulo não tem nenhum import, é catálogo estático e fonte única da verdade. `GET /medidas` existe pra quem preferir buscar |
| D7 | exportar `RelatorioResponse` | **resolvido** — derivado, em `@/lib/relatorio` |
| R3 | contrato de saída de avaliação não tipado | **resolvido** — `AvaliacaoResponse`, `VelocidadeResponse` e `ExercicioResponse` em `@/lib/avaliacoes`. Dá pra trocar o `ReturnType<typeof serializarAvaliacao>` de `features/alunos/tipos.ts:35` pelo import direto |
| B6 | unidade dos 4 saltos novos | **destravado, não resolvido** — o contrato não transporta unidade, então o front não depende disso. No catálogo vem `null` até o cliente responder; código, sigla e nome dos quatro também são provisórios |
| D1 | recortar até a data da avaliação relatada | **parcial** — com `?semanas=` a janela termina nela; sem o parâmetro, ainda cobre tudo |
| D8 | service layer em `src/lib/` | **começou** — `relatorio.ts` é o primeiro caso; sem plano de estender ainda |
| D2 | `totalAvaliacoes` contar só CMJ é intencional? | **aberto** — comportamento documentado, mas a escolha é de produto |
| D5 | `POST`/`PATCH /alunos` devolverem `totalAvaliacoes` | **aberto** — não implementado |
| B2 | seções do relatório que a API não entrega | **resolvido** — as seções que dependiam da curva saíram do MVP; o resto espera as fórmulas reais |
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
