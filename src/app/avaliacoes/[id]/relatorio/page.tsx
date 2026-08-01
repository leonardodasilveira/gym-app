import Link from "next/link";
import { notFound } from "next/navigation";

import { AvisoProvisorio } from "@/features/relatorio/AvisoProvisorio";
import { CardsResumo } from "@/features/relatorio/CardsResumo";
import { RelatorioCabecalho } from "@/features/relatorio/RelatorioCabecalho";
import { RelatorioSecao } from "@/features/relatorio/RelatorioSecao";
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
      <Link
        href={`/alunos/${relatorio.aluno.id}`}
        className="nao-imprimir inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        ← Ficha do aluno
      </Link>

      <div className="mt-4">
        <RelatorioCabecalho
          aluno={relatorio.aluno}
          avaliacao={relatorio.avaliacao}
          periodo={relatorio.periodo}
        />
      </div>

      <AvisoProvisorio provisorio={relatorio.provisorio} />

      <RelatorioSecao id="visao-geral" titulo="Visão geral">
        <CardsResumo
          resumoCmj={relatorio.resumoCmj}
          score={relatorio.score}
          perfil={relatorio.curva.perfil}
        />
      </RelatorioSecao>
    </main>
  );
}
