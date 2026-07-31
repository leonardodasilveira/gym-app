import type { AlunoResumo, StatusFiltro } from "@/features/alunos/tipos";

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
