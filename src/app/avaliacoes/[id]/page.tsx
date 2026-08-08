import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { AcoesAvaliacao } from "@/features/avaliacoes/AcoesAvaliacao";
import { BlocoMedidas } from "@/features/avaliacoes/BlocoMedidas";
import { carregarAvaliacao } from "@/features/avaliacoes/dados";
import { linhasDoBloco } from "@/features/avaliacoes/detalhe";
import { VelocidadeTabelaAvaliacao } from "@/features/avaliacoes/VelocidadeTabelaAvaliacao";
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
  const observacoes = avaliacao.observacoes?.trim() ?? "";

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

      <BlocoMedidas
        id="amplitude"
        titulo="Amplitude"
        legenda="Medidas de amplitude registradas na avaliação"
        linhas={linhasDoBloco(avaliacao, "amplitude")}
      />

      <BlocoMedidas
        id="salto"
        titulo="Salto"
        legenda="Resultados de salto registrados na avaliação"
        linhas={linhasDoBloco(avaliacao, "salto")}
      />

      <section aria-labelledby="velocidade-heading" className="mt-8">
        <h2 id="velocidade-heading" className="text-lg font-semibold">
          Velocidade
        </h2>
        <div className="mt-3">
          <VelocidadeTabelaAvaliacao velocidade={avaliacao.velocidade} />
        </div>
      </section>

      <section aria-labelledby="observacoes-heading" className="mt-8">
        <h2 id="observacoes-heading" className="text-lg font-semibold">
          Observações
        </h2>
        <div className="mt-3">
          {observacoes ? (
            <p className="text-sm whitespace-pre-wrap">{observacoes}</p>
          ) : (
            <EmptyState titulo="Nenhuma observação registrada" />
          )}
        </div>
      </section>

      <AcoesAvaliacao
        avaliacaoId={avaliacao.id}
        alunoId={avaliacao.alunoId}
        dataAvaliacao={avaliacao.dataAvaliacao}
      />
    </main>
  );
}
