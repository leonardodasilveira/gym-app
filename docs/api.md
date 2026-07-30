# API — contrato pro front

Estado: **MVP de demonstração.** Serve pra montar as telas e mostrar pro
professor. Fórmulas e textos do relatório são provisórios — ver
[o que é provisório](#o-que-é-provisório).

Base local: `http://localhost:3000/api`

Os tipos de entrada saem de `src/lib/schemas.ts` e podem ser importados direto:

```ts
import type { CriarAvaliacaoDTO, CriarAlunoDTO } from "@/lib/schemas";
```

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

## Alunos

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/alunos?ativo=true&busca=ana` | lista alunos com `totalAvaliacoes` |
| `POST` | `/alunos` | cria aluno |
| `GET` | `/alunos/:id` | aluno + lista resumida das avaliações |
| `PATCH` | `/alunos/:id` | atualiza (campos parciais) |
| `DELETE` | `/alunos/:id` | remove (cascata nas avaliações) |

```jsonc
// POST /alunos
{ "nome": "Ana Prado", "dataNascimento": "1998-03-14" }  // dataNascimento opcional
```

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
formato de volta, mais `id`, `alunoNome` e `criadoEm` — round-trip garantido,
dá pra usar a resposta pra popular o formulário de edição.

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
- `carga.valor` e `tempo.valor` precisam ser positivos; `repeticoes` inteiro ≥ 1.
- `codigo` do teste é único dentro da avaliação, e `ordem` é única dentro do teste.

## `GET /avaliacoes/:id/relatorio`

Tudo que o relatório precisa, numa chamada. Resposta abreviada:

```jsonc
{
  "aluno":   { "id": "...", "nome": "Ana Prado" },
  "avaliacao": { "id": "...", "dataAvaliacao": "2026-07-30", "observacoes": "..." },
  "periodo": { "de": "2025-07-10", "ate": "2026-07-30", "totalAvaliacoes": 9 },

  "medidas": { /* mesmo formato do DTO */ },

  "curva": {
    "pontos": [
      { "testeCodigo": "SALTO_AGACHADO", "testeNome": "SJ",
        "cargaKg": 20, "velocidadeMs": 0.699 }
      // ...ordenados por carga crescente
    ],
    "cargaMaximaKg": 50,
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

Notas pro front:

- **`ajuste` pode vir `null`** — acontece com menos de 2 pontos de carga, ou se
  todas as cargas forem iguais. Nesse caso `perfil` vem `"Dados insuficientes"`.
- **`resumoCmj` pode vir `null`** se o aluno nunca teve CMJ medido.
- `historicoCmj` **pula** avaliações sem CMJ em vez de mandar zero (era um bug
  conhecido da planilha, ver `planilha-atual.md`).
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
