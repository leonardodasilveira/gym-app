import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BuscaEFiltroAlunos } from "@/features/alunos/BuscaEFiltroAlunos";
import type { AlunoResumo } from "@/features/alunos/tipos";
import { apiFetch } from "@/features/shared/api";
import { origemAtual } from "@/features/shared/origem";
import { paraStatusFiltro } from "@/features/alunos/utils";

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
}>;

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const parametros = await searchParams;
  const busca = typeof parametros.q === "string" ? parametros.q : "";
  const status = paraStatusFiltro(
    typeof parametros.status === "string" ? parametros.status : undefined,
  );

  const origem = await origemAtual();
  const resultado = await apiFetch<AlunoResumo[]>(`${origem}/api/alunos`);

  if (!resultado.ok) {
    throw new Error(resultado.erro.mensagem);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
        <Button render={<Link href="/alunos/novo">Novo aluno</Link>} />
      </div>
      <div className="mt-6">
        {resultado.dados.length === 0 ? (
          <EmptyState titulo="Nenhum aluno cadastrado ainda" />
        ) : (
          <BuscaEFiltroAlunos
            alunos={resultado.dados}
            buscaInicial={busca}
            statusInicial={status}
          />
        )}
      </div>
    </main>
  );
}
