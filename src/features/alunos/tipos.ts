/** Espelha a resposta de GET /alunos (src/app/api/alunos/route.ts). */
export type AlunoResumo = {
  id: string;
  nome: string;
  dataNascimento: string | null;
  ativo: boolean;
  totalAvaliacoes: number;
};

export type StatusFiltro = "todos" | "ativo" | "inativo";
