import { headers } from "next/headers";

import { EmptyState } from "@/components/ui/empty-state";
import { AlunosTabela } from "@/features/alunos/AlunosTabela";
import type { AlunoResumo } from "@/features/alunos/tipos";
import { apiFetch } from "@/features/shared/api";

/**
 * Resolve a origem absoluta a partir do host da requisicao. So usado aqui —
 * quando uma segunda pagina precisar do mesmo, promove para features/shared.
 */
async function origemAtual() {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host");
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "http";
  return `${protocolo}://${host}`;
}

export default async function AlunosPage() {
  const origem = await origemAtual();
  const resultado = await apiFetch<AlunoResumo[]>(`${origem}/api/alunos`);

  if (!resultado.ok) {
    throw new Error(resultado.erro.mensagem);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
      <div className="mt-6">
        {resultado.dados.length === 0 ? (
          <EmptyState titulo="Nenhum aluno cadastrado ainda" />
        ) : (
          <AlunosTabela alunos={resultado.dados} />
        )}
      </div>
    </main>
  );
}
