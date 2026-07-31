import { notFound } from "next/navigation";

import type { AlunoDetalhe, AvaliacaoCompleta } from "@/features/alunos/tipos";
import { apiFetch } from "@/features/shared/api";
import { origemAtual } from "@/features/shared/origem";

type Params = Promise<{ id: string }>;

export default async function AlunoDetalhePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const origem = await origemAtual();
  const idCodificado = encodeURIComponent(id);

  const [resultadoAluno, resultadoAvaliacoes] = await Promise.all([
    apiFetch<AlunoDetalhe>(`${origem}/api/alunos/${idCodificado}`),
    apiFetch<AvaliacaoCompleta[]>(
      `${origem}/api/avaliacoes?alunoId=${idCodificado}&limite=200`,
    ),
  ]);

  // Ordem obrigatoria: aluno antes de avaliacoes. Um id malformado faz
  // /api/avaliacoes responder 422 (Zod rejeita UUID invalido), mas
  // /api/alunos/:id responde 404 nos dois casos (invalido ou inexistente) —
  // e e o 404 que deve decidir a tela, nunca o 422.
  if (!resultadoAluno.ok) {
    if (resultadoAluno.erro.status === 404) {
      notFound();
    }
    throw new Error(resultadoAluno.erro.mensagem);
  }

  if (!resultadoAvaliacoes.ok) {
    throw new Error(resultadoAvaliacoes.erro.mensagem);
  }

  const aluno = resultadoAluno.dados;
  const avaliacoes = resultadoAvaliacoes.dados;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{aluno.nome}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {avaliacoes.length} avaliação(ões) carregada(s).
      </p>
    </main>
  );
}
