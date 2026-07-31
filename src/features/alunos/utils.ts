import { MEDIDAS, siglaComLado, type Lado } from "@/lib/medidas";

import type {
  AlunoResumo,
  AvaliacaoCompleta,
  StatusFiltro,
} from "@/features/alunos/tipos";

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

/**
 * Uma coluna por lado para medida bilateral, uma coluna para medida simples.
 * Sempre derivado de MEDIDAS, na ordem do catalogo — nunca escrito a mao.
 */
export type ColunaMedida = {
  chave: (typeof MEDIDAS)[number]["chave"];
  lado: Lado | null;
  rotulo: string;
  nomeCompleto: string;
  unidade: string;
};

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
  const medida = avaliacao.medidas[coluna.chave];

  if (coluna.lado === null) {
    return (medida as { valor: number | null }).valor;
  }

  return (medida as { direito: number | null; esquerdo: number | null })[
    coluna.lado
  ];
}
