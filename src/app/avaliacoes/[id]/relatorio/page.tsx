import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { AcaoImprimir } from "@/features/relatorio/AcaoImprimir";
import { AnaliseTecnica } from "@/features/relatorio/AnaliseTecnica";
import { AvisoProvisorio } from "@/features/relatorio/AvisoProvisorio";
import { CardsResumo } from "@/features/relatorio/CardsResumo";
import { CurvaTabela } from "@/features/relatorio/CurvaTabela";
import { carregarRelatorio } from "@/features/relatorio/dados";
import { HistoricoCmjTabela } from "@/features/relatorio/HistoricoCmjTabela";
import { ListaTextos } from "@/features/relatorio/ListaTextos";
import { MedidasTabela } from "@/features/relatorio/MedidasTabela";
import { Recomendacoes } from "@/features/relatorio/Recomendacoes";
import { RelatorioCabecalho } from "@/features/relatorio/RelatorioCabecalho";
import { RelatorioSecao } from "@/features/relatorio/RelatorioSecao";
import { ResumoCmj } from "@/features/relatorio/ResumoCmj";
import { dataDeHojeFormatada, formatarData } from "@/features/shared/formato";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const resultado = await carregarRelatorio(id);

  if (!resultado.ok) {
    return { title: "Relatório" };
  }

  const { aluno, avaliacao } = resultado.dados;
  return {
    title: `Relatório — ${aluno.nome} — ${formatarData(avaliacao.dataAvaliacao)}`,
  };
}

export default async function RelatorioPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  // Chamada unica (deduplicada com generateMetadata via cache()): o
  // endpoint de relatorio ja traz tudo, inclusive aluno.id para o link de
  // volta. Sem Zod nesta rota do backend — id malformado e inexistente
  // caem ambos em 404 (route.ts usa findUnique direto).
  const resultado = await carregarRelatorio(id);

  if (!resultado.ok) {
    if (resultado.erro.status === 404) {
      notFound();
    }
    throw new Error(resultado.erro.mensagem);
  }

  const relatorio = resultado.dados;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="nao-imprimir flex items-center justify-between gap-4">
        <Link
          href={`/alunos/${relatorio.aluno.id}`}
          className="inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          ← Ficha do aluno
        </Link>
        <AcaoImprimir />
      </div>

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

      <RelatorioSecao id="resumo-executivo" titulo="Resumo executivo">
        <ResumoCmj resumoCmj={relatorio.resumoCmj} />
      </RelatorioSecao>

      <RelatorioSecao id="curva" titulo="Curva força-velocidade" provisorio>
        <CurvaTabela curva={relatorio.curva} />
      </RelatorioSecao>

      <RelatorioSecao id="analise-tecnica" titulo="Análise técnica" provisorio>
        <AnaliseTecnica ajuste={relatorio.curva.ajuste} />
      </RelatorioSecao>

      <RelatorioSecao id="medidas" titulo="Medidas da avaliação">
        <MedidasTabela medidasDetalhadas={relatorio.medidasDetalhadas} />
      </RelatorioSecao>

      <RelatorioSecao id="historico-cmj" titulo="Histórico de CMJ">
        <HistoricoCmjTabela historicoCmj={relatorio.historicoCmj} />
      </RelatorioSecao>

      <RelatorioSecao
        id="melhorias"
        titulo="Melhorias identificadas"
        provisorio
      >
        <ListaTextos
          itens={relatorio.textos.melhorias}
          mensagemVazia="Nenhuma melhoria registrada"
        />
      </RelatorioSecao>

      <RelatorioSecao id="pontos-atencao" titulo="Pontos de atenção" provisorio>
        <ListaTextos
          itens={relatorio.textos.pontosAtencao}
          mensagemVazia="Nenhum ponto de atenção registrado"
        />
      </RelatorioSecao>

      <RelatorioSecao
        id="recomendacoes"
        titulo="Recomendações de treino"
        provisorio
      >
        <Recomendacoes recomendacoes={relatorio.textos.recomendacoes} />
      </RelatorioSecao>

      <RelatorioSecao id="conclusao" titulo="Conclusão" provisorio>
        {relatorio.textos.conclusao.trim() ? (
          <p className="text-sm">{relatorio.textos.conclusao}</p>
        ) : (
          <EmptyState titulo="Nenhuma conclusão registrada" />
        )}
      </RelatorioSecao>

      <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">
        Relatório gerado em {dataDeHojeFormatada()} · dados e textos
        provisórios, uso apenas para demonstração.
      </footer>
    </main>
  );
}
