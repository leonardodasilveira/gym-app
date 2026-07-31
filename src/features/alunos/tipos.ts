import type { serializarAvaliacao } from "@/lib/avaliacoes";

/** Espelha a resposta de GET /alunos (src/app/api/alunos/route.ts). */
export type AlunoResumo = {
  id: string;
  nome: string;
  dataNascimento: string | null;
  ativo: boolean;
  totalAvaliacoes: number;
};

export type StatusFiltro = "todos" | "ativo" | "inativo";

/** Item de `avaliacoes` em GET /alunos/:id — so id, data e observacoes. */
export type AvaliacaoResumo = {
  id: string;
  dataAvaliacao: string;
  observacoes: string | null;
};

/** Espelha a resposta de GET /alunos/:id (src/app/api/alunos/[id]/route.ts). */
export type AlunoDetalhe = {
  id: string;
  nome: string;
  dataNascimento: string | null;
  ativo: boolean;
  avaliacoes: AvaliacaoResumo[];
};

/**
 * Espelha a resposta de GET /avaliacoes — derivado do serializador real do
 * backend, nao redigitado. Se o backend mudar o formato, o typecheck quebra
 * aqui em vez de a tela quebrar em runtime (frontend-plan.md, risco R3).
 */
export type AvaliacaoCompleta = ReturnType<typeof serializarAvaliacao> & {
  alunoNome: string;
};
