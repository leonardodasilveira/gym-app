import {
  MEDIDAS,
  medidaPorCodigo,
  siglaComLado,
  type ChaveMedida,
  type Lado,
} from "@/lib/medidas";
import type { MedidasDTO } from "@/lib/schemas";

/**
 * Conversao entre o formato do contrato do front (objeto `medidas` com chaves
 * fixas) e o formato do banco (tabela `Medida`, uma linha por codigo).
 */

export type LinhaMedida = {
  codigo: string;
  unidade: string;
  direito: number | null;
  esquerdo: number | null;
  valor: number | null;
};

/** `medidas` do DTO -> linhas prontas pro `create` do Prisma. */
export function medidasParaLinhas(medidas: MedidasDTO): LinhaMedida[] {
  return MEDIDAS.map((definicao) => {
    const entrada = medidas[definicao.chave as keyof MedidasDTO];

    if (definicao.bilateral) {
      const bilateral = entrada as { unidade: string; direito: number | null; esquerdo: number | null };
      return {
        codigo: definicao.codigo,
        unidade: bilateral.unidade,
        direito: bilateral.direito,
        esquerdo: bilateral.esquerdo,
        valor: null,
      };
    }

    const simples = entrada as { unidade: string; valor: number | null };
    return {
      codigo: definicao.codigo,
      unidade: simples.unidade,
      direito: null,
      esquerdo: null,
      valor: simples.valor,
    };
  });
}

/** Linhas do banco -> objeto `medidas` no formato que o front espera. */
export function linhasParaMedidas(linhas: LinhaMedida[]): MedidasDTO {
  const porCodigo = new Map(linhas.map((linha) => [linha.codigo, linha]));

  const entradas = MEDIDAS.map((definicao) => {
    const linha = porCodigo.get(definicao.codigo);
    const unidade = (linha?.unidade ?? definicao.unidade) as "cm";

    const valor = definicao.bilateral
      ? { unidade, direito: linha?.direito ?? null, esquerdo: linha?.esquerdo ?? null }
      : { unidade, valor: linha?.valor ?? null };

    return [definicao.chave, valor] as const;
  });

  return Object.fromEntries(entradas) as MedidasDTO;
}

export type MedidaDetalhada = {
  chave: ChaveMedida;
  codigo: string;
  sigla: string;
  nome: string;
  unidade: string;
  bilateral: boolean;
  /** Uma entrada por lado, ou uma so quando a medida e de valor unico. */
  valores: { sigla: string; rotulo: string; lado: Lado | null; valor: number | null }[];
};

/**
 * Formato achatado pro relatorio: cada valor ja vem com a sigla do professor
 * (`SLB ESQ`) pronta pra imprimir, sem o front precisar montar rotulo.
 */
export function linhasParaMedidasDetalhadas(
  linhas: LinhaMedida[],
): MedidaDetalhada[] {
  const porCodigo = new Map(linhas.map((linha) => [linha.codigo, linha]));

  return MEDIDAS.map((definicao) => {
    const linha = porCodigo.get(definicao.codigo);

    const valores = definicao.bilateral
      ? (["direito", "esquerdo"] as const).map((lado) => ({
          sigla: siglaComLado(definicao.sigla, lado),
          rotulo: `${definicao.nome} (${lado})`,
          lado: lado as Lado,
          valor: linha?.[lado] ?? null,
        }))
      : [
          {
            sigla: definicao.sigla,
            rotulo: definicao.nome,
            lado: null,
            valor: linha?.valor ?? null,
          },
        ];

    return {
      chave: definicao.chave,
      codigo: definicao.codigo,
      sigla: definicao.sigla,
      nome: definicao.nome,
      unidade: linha?.unidade ?? definicao.unidade,
      bilateral: definicao.bilateral,
      valores,
    };
  });
}

/** Sigla da planilha a partir do codigo persistido — `SLB` + lado. */
export function siglaDaMedida(codigo: string, lado?: Lado): string {
  const definicao = medidaPorCodigo(codigo);
  const sigla = definicao?.sigla ?? codigo;
  return lado ? siglaComLado(sigla, lado) : sigla;
}

/** "2026-07-30" -> Date em meia-noite UTC (sem surpresa de fuso). */
export const paraData = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Date -> "2026-07-30". */
export const formatarData = (data: Date): string =>
  data.toISOString().slice(0, 10);

// --- serializacao da resposta ---------------------------------------------

/**
 * Forma minima da avaliacao que o serializador precisa. Estrutural de proposito,
 * igual ao `AvaliacaoParaRelatorio` de src/lib/relatorio.ts: o resultado do
 * Prisma satisfaz sem precisar do tipo gerado.
 *
 * E a **entrada** do serializador. A saida e `AvaliacaoResponse`, mais abaixo.
 */
type AvaliacaoParaSerializar = {
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
export function serializarAvaliacao(avaliacao: AvaliacaoParaSerializar) {
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

/**
 * Contrato de saida de `GET /avaliacoes` e `GET /avaliacoes/:id`. Derivado da
 * serializacao, nao declarado a mao — mudar o formato acima quebra o typecheck
 * de quem consome, que e a mitigacao pedida pelo risco R3 do frontend-plan.md.
 *
 * O front nao precisa mais fazer `ReturnType<typeof serializarAvaliacao>`:
 *
 *   import type { AvaliacaoResponse } from "@/lib/avaliacoes";
 *
 * Importar daqui e seguro: este modulo nao toca `@/lib/prisma` nem `@/lib/http`,
 * entao nada server-only vai junto (frontend-plan.md 7.4). E todos os campos ja
 * sao primitivos ou string — nenhum `Date` sobrevive ate a resposta —, entao o
 * tipo vale igual antes e depois do JSON.
 */
export type AvaliacaoResponse = ReturnType<typeof serializarAvaliacao>;

/** Um exercicio dentro da avaliacao, como sai na resposta. */
export type TesteResponse = AvaliacaoResponse["testes"][number];

/** Uma serie do exercicio, como sai na resposta. */
export type TentativaResponse = TesteResponse["tentativas"][number];

/** `include` padrao pra carregar a avaliacao inteira de uma vez. */
export const avaliacaoCompleta = {
  medidas: true,
  testes: {
    orderBy: { ordem: "asc" },
    include: { tentativas: { orderBy: { ordem: "asc" } } },
  },
} as const;
