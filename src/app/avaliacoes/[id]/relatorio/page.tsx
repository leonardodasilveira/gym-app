import { notFound } from "next/navigation";

import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { apiFetch } from "@/features/shared/api";
import { origemAtual } from "@/features/shared/origem";

type Params = Promise<{ id: string }>;

export default async function RelatorioPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const origem = await origemAtual();
  const idCodificado = encodeURIComponent(id);

  // Chamada unica: o endpoint de relatorio ja traz tudo, inclusive aluno.id
  // para o link de volta. Sem Zod nesta rota do backend — id malformado e
  // inexistente caem ambos em 404 (route.ts usa findUnique direto).
  const resultado = await apiFetch<RelatorioResponse>(
    `${origem}/api/avaliacoes/${idCodificado}/relatorio`,
  );

  if (!resultado.ok) {
    if (resultado.erro.status === 404) {
      notFound();
    }
    throw new Error(resultado.erro.mensagem);
  }

  const relatorio = resultado.dados;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Relatório de performance
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {relatorio.aluno.nome} — {relatorio.avaliacao.dataAvaliacao}
      </p>
    </main>
  );
}
