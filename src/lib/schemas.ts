import { z } from "zod";

import type { ChaveMedida } from "@/lib/medidas";

/**
 * Contrato da API, espelhando os tipos que o front definiu (CriarAvaliacaoDTO).
 * O front pode importar os tipos daqui pra nao duplicar regra de validacao:
 *
 *   import type { CriarAvaliacaoDTO } from "@/lib/schemas";
 */

// --- unidades (literais fechados, como no contrato do front) ---------------

const unidadeComprimento = z.literal("cm");
const unidadeCarga = z.literal("kg");
const unidadeTempo = z.literal("s");

// --- medidas ---------------------------------------------------------------

const medidaBilateral = z.object({
  unidade: unidadeComprimento,
  direito: z.number().min(0).nullable(),
  esquerdo: z.number().min(0).nullable(),
});

const medidaSimples = z.object({
  unidade: unidadeComprimento,
  valor: z.number().min(0).nullable(),
});

/**
 * O objeto `medidas` fica escrito a mao de proposito: e o contrato tipado com o
 * front, e gerar o schema dinamicamente perderia os tipos estaticos. O catalogo
 * (src/lib/medidas.ts) manda em todo o resto — codigo, sigla, rotulo, lado — e o
 * check no fim deste arquivo garante que os dois nao saiam de sincronia.
 */
const medidasSchema = z.object({
  mobilidadeTornozelo: medidaBilateral,
  mobilidadeQuadril: medidaBilateral,
  amplitudeIsquiotibiais: medidaBilateral,
  slb: medidaBilateral,
  cmj: medidaSimples,
});

// --- testes ----------------------------------------------------------------

const valorComUnidade = <T extends z.ZodTypeAny>(unidade: T) =>
  z.object({ valor: z.number().positive(), unidade });

const tentativaSchema = z.object({
  ordem: z.number().int().min(1),
  repeticoes: z.number().int().min(1).max(100),
  carga: valorComUnidade(unidadeCarga),
  tempo: valorComUnidade(unidadeTempo),
});

const testeSchema = z.object({
  codigo: z.string().trim().min(1, "codigo obrigatorio"),
  nome: z.string().trim().min(1, "nome obrigatorio"),
  tentativas: z.array(tentativaSchema).min(1, "informe ao menos 1 tentativa"),
});

// --- avaliacao -------------------------------------------------------------

export const criarAvaliacaoSchema = z.object({
  alunoId: z.uuid("alunoId precisa ser um UUID"),
  dataAvaliacao: z.iso.date("dataAvaliacao no formato AAAA-MM-DD"),
  medidas: medidasSchema,
  testes: z.array(testeSchema),
  observacoes: z.string().trim().optional(),
});

/**
 * `PATCH /avaliacoes/:id`. Cada bloco e opcional e, quando vem, **substitui o
 * bloco inteiro** — nao existe atualizar uma medida sozinha.
 *
 * O motivo e o mesmo que faz `medidas` ter todas as chaves sempre presentes: o
 * formulario edita a avaliacao toda de uma vez, e merge parcial reabriria a
 * duvida entre "nao mandei" e "apaguei", que e a versao em API do problema do
 * zero significando nao medido.
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
  medidas: medidasSchema.optional(),
  testes: z.array(testeSchema).optional(),
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
export type MedidasDTO = z.infer<typeof medidasSchema>;
export type TesteDTO = z.infer<typeof testeSchema>;
export type TentativaDTO = z.infer<typeof tentativaSchema>;
export type CriarAlunoDTO = z.infer<typeof criarAlunoSchema>;
export type AtualizarAlunoDTO = z.infer<typeof atualizarAlunoSchema>;

// --- sincronia entre o catalogo e este schema ------------------------------

type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Quebra a compilacao se alguem acrescentar uma medida no catalogo e esquecer
 * de acrescentar no `medidasSchema` acima (ou vice-versa).
 */
const _chavesEmSincronia: Igual<ChaveMedida, keyof MedidasDTO> = true;
void _chavesEmSincronia;
