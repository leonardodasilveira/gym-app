import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { carregarAvaliacao } from "@/features/avaliacoes/dados";
import { formatarData } from "@/features/shared/formato";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const resultado = await carregarAvaliacao(id);

  if (!resultado.ok) {
    return { title: "Avaliação" };
  }

  const { alunoNome, dataAvaliacao } = resultado.dados;
  return {
    title: `Avaliação — ${alunoNome} — ${formatarData(dataAvaliacao)}`,
  };
}

export default async function AvaliacaoDetalhePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  // Chamada unica (deduplicada com generateMetadata via cache()). Sem Zod
  // nesta rota do backend — id malformado e inexistente caem ambos em 404
  // (route.ts usa findUnique direto), mesma decisao do relatorio.
  const resultado = await carregarAvaliacao(id);

  if (!resultado.ok) {
    if (resultado.erro.status === 404) {
      notFound();
    }
    throw new Error(resultado.erro.mensagem);
  }

  const avaliacao = resultado.dados;
  // criadoEm e ISO completo ("2026-08-08T10:51:48.500Z"), nao "AAAA-MM-DD" —
  // formatarData faz split("-") e quebraria. So a data sobrevive ao corte.
  const dataRegistro = avaliacao.criadoEm.slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href={`/alunos/${avaliacao.alunoId}`}
        className="inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        ← Ficha do aluno
      </Link>

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Avaliação de {formatarData(avaliacao.dataAvaliacao)}
        </h1>
        <Link
          href={`/alunos/${avaliacao.alunoId}`}
          className="w-fit rounded-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {avaliacao.alunoNome}
        </Link>
        <p className="text-sm text-muted-foreground">
          Registrada em {formatarData(dataRegistro)}
        </p>
      </div>
    </main>
  );
}
