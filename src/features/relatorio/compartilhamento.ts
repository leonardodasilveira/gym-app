import type { RelatorioResponse } from "@/features/relatorio/tipos";
import {
  formatarData,
  formatarDeltaOuTraco,
  formatarNumeroOuTraco,
} from "@/features/shared/formato";

export type ConteudoCompartilhamento = {
  assunto: string;
  mensagem: string;
};

export function montarCompartilhamento(
  relatorio: RelatorioResponse,
  urlDaVisao: string,
): ConteudoCompartilhamento {
  const nome = relatorio.aluno.nome;
  const data = formatarData(relatorio.avaliacao.dataAvaliacao);
  const total = relatorio.periodo.totalAvaliacoes;
  const avaliacoes = `${total} ${total === 1 ? "avaliação" : "avaliações"} com CMJ`;
  const janela =
    relatorio.periodo.semanas === null
      ? `Histórico completo (${avaliacoes})`
      : `${relatorio.periodo.semanas} semanas (${avaliacoes})`;

  const linhasCmj = relatorio.resumoCmj
    ? [
        `CMJ mais recente do histórico: ${formatarNumeroOuTraco(relatorio.resumoCmj.atual.valor)} cm`,
        `Variação vs. inicial: ${formatarDeltaOuTraco(relatorio.resumoCmj.variacaoVsInicial)} cm`,
        `Variação vs. pico: ${formatarDeltaOuTraco(relatorio.resumoCmj.variacaoVsPico)} cm`,
      ].join("\n")
    : "Sem CMJ registrado nesta janela.";

  return {
    assunto: `Relatório de performance — ${nome} — ${data}`,
    mensagem: [
      `Relatório de performance — ${nome}`,
      `Avaliação de referência: ${data}`,
      `Janela: ${janela}`,
      "",
      linhasCmj,
      "",
      `Relatório completo: ${urlDaVisao}`,
    ].join("\n"),
  };
}

export function urlWhatsApp(conteudo: ConteudoCompartilhamento): string {
  return `https://wa.me/?text=${encodeURIComponent(conteudo.mensagem)}`;
}

export function urlEmail(conteudo: ConteudoCompartilhamento): string {
  return `mailto:?subject=${encodeURIComponent(conteudo.assunto)}&body=${encodeURIComponent(conteudo.mensagem)}`;
}
