import { z } from "zod";

import type {
  ChaveAmplitude,
  ChaveExercicio,
  ChaveSalto,
} from "@/lib/medidas";

/**
 * Contrato da API — **v2**. O front importa os tipos daqui pra nao duplicar
 * regra de validacao:
 *
 *   import type { CriarAvaliacaoDTO } from "@/lib/schemas";
 *
 * ## Procedencia
 *
 * Este schema e a versao oficial de `schemaAvaliacaoV2Provisorio`, escrito pelo
 * front em `src/features/avaliacoes/contrato-v2.ts` e revisado aqui. A forma foi
 * aceita sem alteracao: mesmos nomes de chave, mesma nullabilidade, mesmos
 * paths de erro. Com isto publicado, `contrato-v2.ts` cumpriu seu prazo de vida
 * e deve ser apagado pelo front (`docs/e5-v2-implementation-spec.md` §13.5).
 *
 * ## O que mudou do v1
 *
 * Sumiram `testes[]`, `tentativas[]`, `ordem` e `repeticoes`: o professor executa
 * as tentativas fora do sistema e digita so o melhor resultado
 * (`docs/evaluation-model-v2-proposal.md` §1). Entraram tres blocos de chaves
 * fixas. E breaking change deliberado, sem versionamento paralelo — nao existe
 * cliente em producao (§11.3 da proposta).
 *
 * ## Nenhuma unidade no payload
 *
 * Diferenca central em relacao ao v1, que exigia `unidade: "cm"` em toda medida.
 * Unidade e propriedade do catalogo (`src/lib/medidas.ts`), nao do dado que
 * trafega: o cliente nao escolhe em que unidade mede o tornozelo. Isso e o que
 * permite os quatro saltos novos existirem **antes** de o cliente responder qual
 * e a unidade deles (bloqueio B6) — a incerteza fica num lugar so, o catalogo,
 * em vez de virar um `z.string()` frouxo no contrato.
 */

// --- blocos Amplitude e Salto ----------------------------------------------

/**
 * `min(0)`: zero e dado real ("medi e deu zero"), negativo nao existe em
 * nenhuma destas medidas. `nullable` e obrigatorio, nao conveniencia — e o que
 * separa "nao medido" de "medido e deu zero", o defeito herdado da planilha que
 * o produto existe pra eliminar (`docs/planilha-atual.md` §139-141).
 */
const valorMedida = z.number().min(0).nullable();

const parBilateral = z.object({
  direito: valorMedida,
  esquerdo: valorMedida,
});

const amplitudeSchema = z.object({
  tornozelo: parBilateral,
  quadril: parBilateral,
  isquiotibiais: parBilateral,
  slb: parBilateral,
});

const saltosSchema = z.object({
  cmj: valorMedida,
  salto2: valorMedida,
  salto3: valorMedida,
  salto4: valorMedida,
  salto5: valorMedida,
});

// --- bloco Velocidade ------------------------------------------------------

/**
 * Carga e tempo sao mutuamente dependentes: ou os dois preenchidos, ou os dois
 * `null`. Meio par e dado inutilizavel que mente sobre estar completo — carga
 * sem tempo nao produz velocidade, tempo sem carga nao tem abscissa na curva
 * (`evaluation-model-v2-proposal.md` §6.1).
 *
 * Nao e expressavel por tipo; por isso o `superRefine`. O `path` relativo e
 * prefixado pelo Zod com o caminho de aninhamento, produzindo
 * `velocidade.squatJump.tempoSegundos` — o front depende dessa string literal,
 * porque o `name` de cada input e igual ao path do issue. Coberto por teste em
 * `schemas.test.ts` de proposito: e contrato entre times, nao detalhe interno.
 *
 * `cargaKg` aceita **zero**: Squat Jump sem carga externa (peso corporal) e
 * medicao legitima, e o ponto `(0, v)` e justamente o intercepto V0 medido, o
 * que melhora o ajuste da curva. O v1 rejeitava com `positive()`, o que sob o
 * modelo novo estaria errado (§6.3 da proposta).
 *
 * `tempoSegundos` continua estritamente positivo: zero seria divisao por zero
 * no calculo de velocidade.
 */
const exercicioVelocidadeSchema = z
  .object({
    cargaKg: z.number().min(0).nullable(),
    tempoSegundos: z.number().positive().nullable(),
  })
  .superRefine((valor, ctx) => {
    const cargaPreenchida = valor.cargaKg !== null;
    const tempoPreenchido = valor.tempoSegundos !== null;

    if (cargaPreenchida && !tempoPreenchido) {
      ctx.addIssue({
        code: "custom",
        path: ["tempoSegundos"],
        message: "Informe o tempo junto com a carga.",
      });
    }

    if (tempoPreenchido && !cargaPreenchida) {
      ctx.addIssue({
        code: "custom",
        path: ["cargaKg"],
        message: "Informe a carga junto com o tempo.",
      });
    }
  });

const velocidadeSchema = z.object({
  squatJump: exercicioVelocidadeSchema,
  agachamento: exercicioVelocidadeSchema,
});

// --- avaliacao -------------------------------------------------------------

export const criarAvaliacaoSchema = z.object({
  alunoId: z.uuid("alunoId precisa ser um UUID"),
  dataAvaliacao: z.iso.date("dataAvaliacao no formato AAAA-MM-DD"),
  amplitude: amplitudeSchema,
  saltos: saltosSchema,
  velocidade: velocidadeSchema,
  observacoes: z.string().trim().optional(),
});

/**
 * `PATCH /avaliacoes/:id`. Cada bloco e opcional e, quando vem, **substitui o
 * bloco inteiro** — nao existe atualizar uma medida sozinha.
 *
 * O motivo e o mesmo que faz as chaves estarem sempre presentes: o formulario
 * edita a avaliacao toda de uma vez, e merge parcial reabriria a duvida entre
 * "nao mandei" e "apaguei", que e a versao em API do problema do zero
 * significando nao medido.
 *
 * `observacoes` e `nullish` pela mesma razao do `dataNascimento` do aluno
 * (frontend-plan.md D3): omitir mantem, `null` limpa, texto troca. Sem o `null`
 * nao existiria payload capaz de apagar uma observacao.
 *
 * `alunoId` fica de fora de proposito: avaliacao nao muda de aluno. Pra isso,
 * apagar e criar de novo.
 */
export const atualizarAvaliacaoSchema = z.object({
  dataAvaliacao: z.iso.date("dataAvaliacao no formato AAAA-MM-DD").optional(),
  amplitude: amplitudeSchema.optional(),
  saltos: saltosSchema.optional(),
  velocidade: velocidadeSchema.optional(),
  observacoes: z.string().trim().nullish(),
});

// --- aluno -----------------------------------------------------------------

export const criarAlunoSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa de pelo menos 2 letras"),
  dataNascimento: z.iso.date("dataNascimento no formato AAAA-MM-DD").optional(),
  ativo: z.boolean().optional(),
});

/**
 * No PATCH, `dataNascimento` e `nullish`: omitir mantem o valor atual, `null`
 * limpa o campo (a coluna e `DateTime?`) e uma data troca. Sem o `null` nao
 * existia payload capaz de limpar a data — ver `frontend-plan.md` D3.
 */
export const atualizarAlunoSchema = criarAlunoSchema.partial().extend({
  dataNascimento: z.iso
    .date("dataNascimento no formato AAAA-MM-DD")
    .nullish(),
});

// --- query params ----------------------------------------------------------

export const listarAlunosQuerySchema = z.object({
  ativo: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  busca: z.string().trim().optional(),
});

export const listarAvaliacoesQuerySchema = z.object({
  alunoId: z.uuid().optional(),
  limite: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * `semanas` e opcional **sem default de proposito**: ausente = historico
 * inteiro, que e o comportamento historico da rota. Um default aqui mudaria
 * calado os numeros de todo relatorio ja existente.
 */
export const relatorioQuerySchema = z.object({
  semanas: z.coerce
    .number()
    .int("semanas precisa ser inteiro")
    .min(1, "semanas precisa ser pelo menos 1")
    .max(520, "semanas nao pode passar de 520 (10 anos)")
    .optional(),
});

// --- tipos exportados pro front -------------------------------------------

export type CriarAvaliacaoDTO = z.infer<typeof criarAvaliacaoSchema>;
export type AtualizarAvaliacaoDTO = z.infer<typeof atualizarAvaliacaoSchema>;
export type AmplitudeDTO = z.infer<typeof amplitudeSchema>;
export type SaltosDTO = z.infer<typeof saltosSchema>;
export type VelocidadeDTO = z.infer<typeof velocidadeSchema>;
export type ExercicioVelocidadeDTO = z.infer<typeof exercicioVelocidadeSchema>;
export type CriarAlunoDTO = z.infer<typeof criarAlunoSchema>;
export type AtualizarAlunoDTO = z.infer<typeof atualizarAlunoSchema>;

// --- sincronia entre o catalogo e este schema ------------------------------

type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Quebram a compilacao se alguem acrescentar uma medida ou um exercicio no
 * catalogo e esquecer de acrescentar no bloco correspondente aqui em cima (ou
 * vice-versa). Um check por bloco, porque agora sao tres objetos e nao um.
 */
const _amplitudeEmSincronia: Igual<ChaveAmplitude, keyof AmplitudeDTO> = true;
const _saltosEmSincronia: Igual<ChaveSalto, keyof SaltosDTO> = true;
const _velocidadeEmSincronia: Igual<ChaveExercicio, keyof VelocidadeDTO> = true;
void _amplitudeEmSincronia;
void _saltosEmSincronia;
void _velocidadeEmSincronia;
