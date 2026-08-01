import Link from "next/link";

import { AlunoForm } from "@/features/alunos/AlunoForm";
import type { AlunoResumo } from "@/features/alunos/tipos";
import { apiFetch } from "@/features/shared/api";
import { origemAtual } from "@/features/shared/origem";

export default async function NovoAlunoPage() {
  const origem = await origemAtual();
  const resultado = await apiFetch<AlunoResumo[]>(`${origem}/api/alunos`);

  if (!resultado.ok) {
    throw new Error(resultado.erro.mensagem);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/alunos"
        className="inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        ← Alunos
      </Link>

      <div className="mt-4 max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Novo aluno</h1>
        <AlunoForm
          modo="criar"
          aluno={null}
          nomesExistentes={resultado.dados.map((aluno) => ({
            id: aluno.id,
            nome: aluno.nome,
          }))}
        />
      </div>
    </main>
  );
}
