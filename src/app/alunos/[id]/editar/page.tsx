import Link from "next/link";
import { notFound } from "next/navigation";

import { AlunoForm } from "@/features/alunos/AlunoForm";
import type { AlunoDetalhe, AlunoResumo } from "@/features/alunos/tipos";
import { apiFetch } from "@/features/shared/api";
import { origemAtual } from "@/features/shared/origem";

type Params = Promise<{ id: string }>;

export default async function EditarAlunoPage({ params }: { params: Params }) {
  const { id } = await params;
  const origem = await origemAtual();
  const idCodificado = encodeURIComponent(id);

  const [resultadoAluno, resultadoAlunos] = await Promise.all([
    apiFetch<AlunoDetalhe>(`${origem}/api/alunos/${idCodificado}`),
    apiFetch<AlunoResumo[]>(`${origem}/api/alunos`),
  ]);

  if (!resultadoAluno.ok) {
    if (resultadoAluno.erro.status === 404) {
      notFound();
    }
    throw new Error(resultadoAluno.erro.mensagem);
  }

  if (!resultadoAlunos.ok) {
    throw new Error(resultadoAlunos.erro.mensagem);
  }

  const aluno = resultadoAluno.dados;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href={`/alunos/${aluno.id}`}
        className="inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        ← Voltar
      </Link>

      <div className="mt-4 max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Editar aluno</h1>
        <AlunoForm
          modo="editar"
          aluno={{
            id: aluno.id,
            nome: aluno.nome,
            dataNascimento: aluno.dataNascimento,
            ativo: aluno.ativo,
          }}
          nomesExistentes={resultadoAlunos.dados.map((item) => ({
            id: item.id,
            nome: item.nome,
          }))}
        />
      </div>
    </main>
  );
}
