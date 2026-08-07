import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { AcoesAluno } from "@/features/alunos/AcoesAluno";
import { AlunoCabecalho } from "@/features/alunos/AlunoCabecalho";
import { ComparacaoAvaliacoes } from "@/features/alunos/ComparacaoAvaliacoes";
import { HistoricoAvaliacoes } from "@/features/alunos/HistoricoAvaliacoes";
import { VelocidadeAvaliacao } from "@/features/alunos/VelocidadeAvaliacao";
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
  const totalAvaliacoes = aluno.avaliacoes.length;
  const dataMaisRecente = aluno.avaliacoes[0]?.dataAvaliacao ?? null;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/alunos"
        className="inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        ← Alunos
      </Link>

      <div className="mt-4">
        <AlunoCabecalho
          aluno={aluno}
          totalAvaliacoes={totalAvaliacoes}
          dataMaisRecente={dataMaisRecente}
        />
      </div>

      <div className="mt-6">
        <AcoesAluno aluno={aluno} totalAvaliacoes={totalAvaliacoes} />
      </div>

      {avaliacoes.length === 0 ? (
        <div className="mt-8">
          <EmptyState titulo="Nenhuma avaliação registrada ainda" />
        </div>
      ) : (
        <>
          {avaliacoes.length >= 2 ? (
            <ComparacaoAvaliacoes atual={avaliacoes[0]} anterior={avaliacoes[1]} />
          ) : (
            <section aria-labelledby="comparacao-heading" className="mt-8">
              <h2 id="comparacao-heading" className="text-lg font-semibold">
                Comparação com a avaliação anterior
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta é a primeira avaliação — ainda não há comparação.
              </p>
            </section>
          )}

          <HistoricoAvaliacoes avaliacoes={avaliacoes} nomeAluno={aluno.nome} />

          <VelocidadeAvaliacao avaliacao={avaliacoes[0]} />
        </>
      )}
    </main>
  );
}
