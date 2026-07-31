import { MEDIDAS, siglaComLado, type Lado } from "@/lib/medidas";

import type {
  AlunoResumo,
  AvaliacaoCompleta,
  StatusFiltro,
} from "@/features/alunos/tipos";
import { arredondar } from "@/features/shared/formato";

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

/** Remove espacos nas extremidades, acentos e diferenca de maiusculas. */
export function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase();
}

/** Qualquer valor fora de "ativo"/"inativo" vira "todos", sem erro. */
export function paraStatusFiltro(valor: string | undefined): StatusFiltro {
  return valor === "ativo" || valor === "inativo" ? valor : "todos";
}

/** Pura: nao muta `alunos`. Busca por nome, insensivel a acento e caixa. */
export function filtrarAlunos(
  alunos: AlunoResumo[],
  busca: string,
  status: StatusFiltro,
): AlunoResumo[] {
  const buscaNormalizada = normalizarTexto(busca);

  return alunos.filter((aluno) => {
    if (status === "ativo" && !aluno.ativo) return false;
    if (status === "inativo" && aluno.ativo) return false;

    if (
      buscaNormalizada &&
      !normalizarTexto(aluno.nome).includes(buscaNormalizada)
    ) {
      return false;
    }

    return true;
  });
}

type ColunaMedidaBase = {
  rotulo: string;
  nomeCompleto: string;
  unidade: string;
};

/**
 * Uma coluna por lado para medida bilateral, uma coluna para medida simples.
 * Sempre derivado de MEDIDAS, na ordem do catalogo — nunca escrito a mao.
 *
 * Uniao discriminada por `lado`: cada ramo restringe `chave` as unicas
 * chaves de MEDIDAS daquele formato, entao `avaliacao.medidas[chave]`
 * resolve para um tipo unico (nunca a uniao dos 5 formatos) sem `as`.
 */
export type ColunaMedida =
  | (ColunaMedidaBase & {
      chave: Extract<(typeof MEDIDAS)[number], { bilateral: true }>["chave"];
      lado: Lado;
    })
  | (ColunaMedidaBase & {
      chave: Extract<(typeof MEDIDAS)[number], { bilateral: false }>["chave"];
      lado: null;
    });

export function colunasDeMedida(): ColunaMedida[] {
  return MEDIDAS.flatMap((definicao): ColunaMedida[] => {
    if (definicao.bilateral) {
      return (["direito", "esquerdo"] as const).map((lado) => ({
        chave: definicao.chave,
        lado,
        rotulo: siglaComLado(definicao.sigla, lado),
        nomeCompleto: `${definicao.nome} (${lado})`,
        unidade: definicao.unidade,
      }));
    }

    return [
      {
        chave: definicao.chave,
        lado: null,
        rotulo: definicao.sigla,
        nomeCompleto: definicao.nome,
        unidade: definicao.unidade,
      },
    ];
  });
}

/** Valor de uma coluna numa avaliacao — null quando nao medido. */
export function valorDaColuna(
  avaliacao: AvaliacaoCompleta,
  coluna: ColunaMedida,
): number | null {
  if (coluna.lado === null) {
    return avaliacao.medidas[coluna.chave].valor;
  }

  return avaliacao.medidas[coluna.chave][coluna.lado];
}

/** Uma linha por coluna de medida, comparando duas avaliacoes. */
export type LinhaComparacao = {
  rotulo: string;
  nomeCompleto: string;
  unidade: string;
  anterior: number | null;
  atual: number | null;
  /** null quando `anterior` ou `atual` (ou ambos) sao null — nunca 0 nesse caso. */
  delta: number | null;
};

/**
 * Compara duas avaliacoes coluna a coluna. Todas as 9 linhas sempre saem,
 * mesmo com os dois lados nulos — a ausencia e informacao para o professor.
 * Delta so e calculado quando os dois valores sao numeros (0 incluido).
 */
export function montarLinhasComparacao(
  atual: AvaliacaoCompleta,
  anterior: AvaliacaoCompleta,
): LinhaComparacao[] {
  return colunasDeMedida().map((coluna) => {
    const valorAtual = valorDaColuna(atual, coluna);
    const valorAnterior = valorDaColuna(anterior, coluna);
    const delta =
      valorAtual !== null && valorAnterior !== null
        ? arredondar(valorAtual - valorAnterior)
        : null;

    return {
      rotulo: coluna.rotulo,
      nomeCompleto: coluna.nomeCompleto,
      unidade: coluna.unidade,
      anterior: valorAnterior,
      atual: valorAtual,
      delta,
    };
  });
}
