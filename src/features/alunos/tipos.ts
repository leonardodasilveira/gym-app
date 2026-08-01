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

// --- formulario de aluno (E4) -----------------------------------------------

export type CampoAluno = "nome" | "dataNascimento";

export type ValoresAluno = {
  nome: string;
  /** "" quando ausente — nunca null, pra caber direto no defaultValue do input. */
  dataNascimento: string;
};

/**
 * Estado devolvido por `criarAluno`/`atualizarAluno` (features/alunos/acoes.ts)
 * pro useActionState do AlunoForm. `valores` ecoa o que foi submetido — nao
 * confiamos no DOM pra preservar apos erro (spec e4-implementation-spec.md 5.4).
 */
export type EstadoAluno =
  | { status: "inicial" }
  | { status: "sucesso"; id: string }
  | {
      status: "erro";
      /** Erro geral: 400/404/409/500/rede. null quando so ha erro de campo. */
      mensagem: string | null;
      errosPorCampo: Partial<Record<CampoAluno, string>>;
      valores: ValoresAluno;
      /** Incrementa a cada submissao falha, pra reexecutar o foco mesmo com mensagem identica. */
      tentativa: number;
    };
