# API — contrato pro front

Estado: **MVP de demonstração.** Serve pra montar as telas e mostrar pro
professor. Fórmulas e textos do relatório são provisórios — ver
[o que é provisório](#o-que-é-provisório).

Base local: `http://localhost:3000/api`

Os tipos podem ser importados direto — **entrada e saída**:

```ts
import type { CriarAvaliacaoDTO, CriarAlunoDTO } from "@/lib/schemas";
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
      "chave": "mobilidadeTornozelo",       // chave no objeto `medidas` do DTO
      "codigo": "MOBILIDADE_TORNOZELO",
      "sigla": "TOR",
      "nome": "Mobilidade de tornozelo",
      "unidade": "cm",
      "bilateral": true,
      "siglas": { "direito": "TOR DIR", "esquerdo": "TOR ESQ" }
    },
    {
      "chave": "cmj",
      "codigo": "CMJ",
      "sigla": "CMJ",
      "nome": "Counter Movement Jump",
      "unidade": "cm",
      "bilateral": false,
      "siglas": { "valor": "CMJ" }          // medida simples: sem lado
    }
  ]
}
```

Dá pra montar o formulário de avaliação inteiro a partir daqui: `bilateral`
decide se são dois campos ou um, e `chave` diz onde o valor entra no DTO.

> Fonte única: `src/lib/medidas.ts`. Acrescentar medida é uma entrada lá + o
> campo no `medidasSchema`; se esquecer a segunda parte, o `npm run typecheck`
> quebra de propósito.

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
| `DELETE` | `/avaliacoes/:id` | remove |
| `GET` | `/avaliacoes/:id/relatorio` | dados do relatório de performance |

### `POST /avaliacoes`

Recebe exatamente o formato combinado. `GET /avaliacoes/:id` devolve o mesmo
formato de volta, mais `id`, `alunoNome` e `criadoEm` — round-trip garantido.

⚠️ **Não existe endpoint de edição de avaliação.** Só há `POST`, `GET` e
`DELETE`. Enquanto for assim, corrigir uma avaliação significa excluir e
recriar.

```jsonc
{
  "alunoId": "8d1f5b89-90cb-4b61-a4c8-1e6ef7f71d67",  // uuid, precisa existir
  "dataAvaliacao": "2026-07-30",                       // AAAA-MM-DD
  "medidas": {
    "mobilidadeTornozelo":    { "unidade": "cm", "direito": 11.5, "esquerdo": 12.1 },
    "mobilidadeQuadril":      { "unidade": "cm", "direito": 18.4, "esquerdo": 17.8 },
    "amplitudeIsquiotibiais": { "unidade": "cm", "direito": 21,   "esquerdo": 20.7 },
    "slb":                    { "unidade": "cm", "direito": 32.5, "esquerdo": 31.9 },
    "cmj":                    { "unidade": "cm", "valor": 42.8 }
  },
  "testes": [
    {
      "codigo": "SALTO_AGACHADO",
      "nome": "SJ",
      "tentativas": [
        { "ordem": 1, "repeticoes": 2, "carga": { "valor": 20, "unidade": "kg" },
          "tempo": { "valor": 1.43, "unidade": "s" } }
      ]
    }
  ],
  "observacoes": "Boa evolução na mobilidade e nos testes."  // opcional
}
```

Regras de validação relevantes:

- **Valores de medida aceitam `null`** (`direito`, `esquerdo`, `valor`), mas as
  cinco chaves de `medidas` são obrigatórias. Avaliação parcial é a norma no
  processo do professor, então o front pode mandar `null` à vontade.
- `unidade` é literal fechado: `"cm"` em medidas, `"kg"` em carga, `"s"` em tempo.
- `testes` pode vir vazio (`[]`), mas um teste presente precisa de ao menos uma
  tentativa.
- `carga.valor` e `tempo.valor` precisam ser positivos; `repeticoes` inteiro
  entre **1 e 100**.
- `codigo` do teste é único dentro da avaliação, e `ordem` é única dentro do
  teste. Atenção: isso é **constraint de banco**, não validação de schema —
  a violação volta como **409 sem indicar o campo**, ao contrário do 422, que
  traz `issues`. Vale prevenir no cliente.

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
nem `score`**, que saem dos testes da própria avaliação relatada, não do
histórico.

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

  "medidas": { /* mesmo formato do DTO */ },

  // mesmo conteúdo, achatado e com a sigla do professor pronta pra imprimir
  "medidasDetalhadas": [
    {
      "chave": "slb", "codigo": "SLB", "sigla": "SLB", "nome": "SLB",
      "unidade": "cm", "bilateral": true,
      "valores": [
        { "sigla": "SLB DIR", "rotulo": "SLB (direito)",  "lado": "direito",  "valor": 32.5 },
        { "sigla": "SLB ESQ", "rotulo": "SLB (esquerdo)", "lado": "esquerdo", "valor": 31.9 }
      ]
    }
  ],

  "curva": {
    "pontos": [
      { "testeCodigo": "SALTO_AGACHADO", "testeNome": "SJ",
        "cargaKg": 20, "velocidadeMs": 0.699 }
      // ...ordenados por carga crescente
    ],
    "cargaMaximaKg": 50,       // pode vir null — ver notas abaixo
    "ajuste": {
      "inclinacao": -0.01187,   // m/s por kg
      "v0": 0.944,              // velocidade teórica máxima
      "f0": 79.5,               // carga teórica máxima
      "r2": 0.919,              // qualidade do ajuste, 0–1
      "cargaOtimaKg": 39.8,
      "velocidadeOtimaMs": 0.472
    },
    "perfil": "Equilibrado"
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

Notas pro front:

- **`ajuste` pode vir `null`** — acontece com menos de 2 pontos de carga, ou se
  todas as cargas forem iguais. Nesse caso `perfil` vem `"Dados insuficientes"`.
- **`resumoCmj` pode vir `null`** se o aluno nunca teve CMJ medido.
- **`curva.cargaMaximaKg` pode vir `null`** quando a avaliação não tem nenhuma
  tentativa com carga.
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

O ponto mais frágil: **o contrato manda `tempo` (s) e `repeticoes`, não
velocidade.** Pra virar m/s falta o deslocamento por repetição, que hoje é uma
constante chutada (0,5 m) em `DESLOCAMENTO_POR_CODIGO`. Os números saem na ordem
certa (mais carga → mais lento), mas a escala não bate com a VMP que o professor
usa hoje. Está na lista de dúvidas como a nº 11.

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
| D1 | recortar até a data da avaliação relatada | **parcial** — com `?semanas=` a janela termina nela; sem o parâmetro, ainda cobre tudo |
| D8 | service layer em `src/lib/` | **começou** — `relatorio.ts` é o primeiro caso; sem plano de estender ainda |
| D2 | `totalAvaliacoes` contar só CMJ é intencional? | **aberto** — comportamento documentado, mas a escolha é de produto |
| D5 | `POST`/`PATCH /alunos` devolverem `totalAvaliacoes` | **aberto** — não implementado |
| B2 | seções do relatório que a API não entrega | **aberto** — depende das fórmulas reais |
| B3 | o que significa compartilhar | **aberto** — decisão de produto |
| B4 | filiais entram no MVP? | **aberto** — não existem no schema |
| B5 | o MVP edita avaliação? | **aberto** — hoje só excluir e recriar |

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
