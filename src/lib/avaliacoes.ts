import {
  CODIGO_POR_MEDIDA,
  MEDIDAS_BILATERAIS,
  type ChaveMedida,
  type MedidasDTO,
} from "@/lib/schemas";

/**
 * Conversao entre o formato do contrato do front (objeto `medidas` com chaves
 * fixas) e o formato do banco (tabela `Medida`, uma linha por codigo).
 */

type LinhaMedida = {
  codigo: string;
  unidade: string;
  direito: number | null;
  esquerdo: number | null;
  valor: number | null;
};

const ehBilateral = (chave: ChaveMedida): boolean =>
  (MEDIDAS_BILATERAIS as readonly string[]).includes(chave);

/** `medidas` do DTO -> linhas prontas pro `createMany` do Prisma. */
export function medidasParaLinhas(medidas: MedidasDTO): LinhaMedida[] {
  return (Object.keys(CODIGO_POR_MEDIDA) as ChaveMedida[]).map((chave) => {
    const codigo = CODIGO_POR_MEDIDA[chave];

    if (ehBilateral(chave)) {
      const medida = medidas[chave] as { unidade: string; direito: number | null; esquerdo: number | null };
      return {
        codigo,
        unidade: medida.unidade,
        direito: medida.direito,
        esquerdo: medida.esquerdo,
        valor: null,
      };
    }

    const medida = medidas[chave] as { unidade: string; valor: number | null };
    return {
      codigo,
      unidade: medida.unidade,
      direito: null,
      esquerdo: null,
      valor: medida.valor,
    };
  });
}

/** Linhas do banco -> objeto `medidas` no formato que o front espera. */
export function linhasParaMedidas(linhas: LinhaMedida[]): MedidasDTO {
  const porCodigo = new Map(linhas.map((linha) => [linha.codigo, linha]));

  const montar = (chave: ChaveMedida) => {
    const linha = porCodigo.get(CODIGO_POR_MEDIDA[chave]);
    const unidade = (linha?.unidade ?? "cm") as "cm";

    return ehBilateral(chave)
      ? { unidade, direito: linha?.direito ?? null, esquerdo: linha?.esquerdo ?? null }
      : { unidade, valor: linha?.valor ?? null };
  };

  return {
    mobilidadeTornozelo: montar("mobilidadeTornozelo"),
    mobilidadeQuadril: montar("mobilidadeQuadril"),
    amplitudeIsquiotibiais: montar("amplitudeIsquiotibiais"),
    slb: montar("slb"),
    cmj: montar("cmj"),
  } as MedidasDTO;
}

/** "2026-07-30" -> Date em meia-noite UTC (sem surpresa de fuso). */
export const paraData = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Date -> "2026-07-30". */
export const formatarData = (data: Date): string =>
  data.toISOString().slice(0, 10);

// --- serializacao da resposta ---------------------------------------------

type AvaliacaoCompleta = {
  id: string;
  alunoId: string;
  dataAvaliacao: Date;
  observacoes: string | null;
  criadoEm: Date;
  medidas: LinhaMedida[];
  testes: {
    codigo: string;
    nome: string;
    ordem: number;
    tentativas: {
      ordem: number;
      repeticoes: number;
      cargaValor: number;
      cargaUnidade: string;
      tempoValor: number;
      tempoUnidade: string;
    }[];
  }[];
};

/** Devolve a avaliacao no mesmo formato do DTO de entrada, mais id e criadoEm. */
export function serializarAvaliacao(avaliacao: AvaliacaoCompleta) {
  return {
    id: avaliacao.id,
    alunoId: avaliacao.alunoId,
    dataAvaliacao: formatarData(avaliacao.dataAvaliacao),
    medidas: linhasParaMedidas(avaliacao.medidas),
    testes: avaliacao.testes.map((teste) => ({
      codigo: teste.codigo,
      nome: teste.nome,
      tentativas: teste.tentativas.map((tentativa) => ({
        ordem: tentativa.ordem,
        repeticoes: tentativa.repeticoes,
        carga: { valor: tentativa.cargaValor, unidade: tentativa.cargaUnidade },
        tempo: { valor: tentativa.tempoValor, unidade: tentativa.tempoUnidade },
      })),
    })),
    observacoes: avaliacao.observacoes,
    criadoEm: avaliacao.criadoEm.toISOString(),
  };
}

/** `include` padrao pra carregar a avaliacao inteira de uma vez. */
export const avaliacaoCompleta = {
  medidas: true,
  testes: {
    orderBy: { ordem: "asc" },
    include: { tentativas: { orderBy: { ordem: "asc" } } },
  },
} as const;
