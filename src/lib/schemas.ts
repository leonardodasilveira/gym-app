import { z } from "zod";

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
 * Chaves do objeto `medidas` -> codigo guardado no banco.
 * Acrescentar medida nova = uma linha aqui + uma no schema de entrada.
 */
export const CODIGO_POR_MEDIDA = {
  mobilidadeTornozelo: "MOBILIDADE_TORNOZELO",
  mobilidadeQuadril: "MOBILIDADE_QUADRIL",
  amplitudeIsquiotibiais: "AMPLITUDE_ISQUIOTIBIAIS",
  slb: "SLB",
  cmj: "CMJ",
} as const;

export type ChaveMedida = keyof typeof CODIGO_POR_MEDIDA;

/** Medidas que tem lado direito/esquerdo (o resto e valor unico). */
export const MEDIDAS_BILATERAIS = [
  "mobilidadeTornozelo",
  "mobilidadeQuadril",
  "amplitudeIsquiotibiais",
  "slb",
] as const satisfies readonly ChaveMedida[];

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

// --- aluno -----------------------------------------------------------------

export const criarAlunoSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa de pelo menos 2 letras"),
  dataNascimento: z.iso.date("dataNascimento no formato AAAA-MM-DD").optional(),
  ativo: z.boolean().optional(),
});

export const atualizarAlunoSchema = criarAlunoSchema.partial();

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

// --- tipos exportados pro front -------------------------------------------

export type CriarAvaliacaoDTO = z.infer<typeof criarAvaliacaoSchema>;
export type MedidasDTO = z.infer<typeof medidasSchema>;
export type TesteDTO = z.infer<typeof testeSchema>;
export type TentativaDTO = z.infer<typeof tentativaSchema>;
export type CriarAlunoDTO = z.infer<typeof criarAlunoSchema>;
export type AtualizarAlunoDTO = z.infer<typeof atualizarAlunoSchema>;
