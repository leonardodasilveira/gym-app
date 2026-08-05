import {
  formatarData,
  linhasParaAmplitude,
  linhasParaMedidasDetalhadas,
  linhasParaSaltos,
  linhasParaVelocidade,
  type LinhaMedida,
  type LinhaVelocidade,
} from "@/lib/avaliacoes";
import { EXERCICIOS_VELOCIDADE } from "@/lib/medidas";
import { textosPlaceholder } from "@/lib/textos";

/**
 * Montagem da resposta de GET /avaliacoes/:id/relatorio.
 *
 * Vive fora do route handler por um motivo especifico: o tipo da resposta e
 * derivado daqui (`RelatorioResponse`) e o front consome esse tipo. Por isso
 * este modulo **nao pode importar `@/lib/prisma` nem `@/lib/http`** — quem
 * busca no banco e o route handler, que passa os dados ja carregados. Assim o
 * front faz `import type` sem arrastar modulo server-only (frontend-plan.md
 * 7.4) e sem depender de um arquivo `route.ts`.
 *
 * ⚠️ Os textos sao provisorios — ver src/lib/textos.ts.
 *
 * ## A curva forca-velocidade saiu do relatorio (05/08/2026)
 *
 * O relatorio nao devolve mais `curva`, `ajuste`, `perfil` nem `score`. Decisao
 * de produto, tomada depois que o modelo v2 reduziu a curva de 8 pontos para no
 * maximo 2: com 2 pontos a reta e exata por construcao, `r2` da 1 sempre e o
 * perfil e o score viram funcao de duas medicoes. Nao havia como sustentar as
 * secoes 2, 3, 4, 7 e 10 do relatorio em cima disso
 * (evaluation-model-v2-proposal.md secao 9.4).
 *
 * No lugar entra o dado **medido**: carga e tempo de cada exercicio, como o
 * professor digitou. Sem derivacao, sem deslocamento estimado, sem regressao.
 */

export type PontoCmj = { data: string; valor: number };

/**
 * Forma minima da avaliacao necessaria pro relatorio. Estrutural de proposito:
 * o resultado do Prisma satisfaz sem precisar do tipo gerado.
 */
export type AvaliacaoParaRelatorio = {
  id: string;
  dataAvaliacao: Date;
  observacoes: string | null;
  aluno: { id: string; nome: string };
  medidas: LinhaMedida[];
  velocidades: LinhaVelocidade[];
};

/**
 * Recorta o historico numa janela de `semanas` terminando na data da
 * avaliacao relatada. `undefined` devolve a serie inteira — e o comportamento
 * default da rota, preservado byte a byte.
 *
 * Compara string ISO com string ISO ("2026-07-30"), que ordena
 * lexicograficamente igual a cronologicamente: sem Date no meio do caminho,
 * sem risco de fuso (frontend-plan.md R5).
 */
function recortarHistorico(
  historico: PontoCmj[],
  ate: string,
  semanas: number | undefined,
): PontoCmj[] {
  if (semanas === undefined) return historico;

  const inicio = new Date(`${ate}T00:00:00.000Z`);
  inicio.setUTCDate(inicio.getUTCDate() - semanas * 7);
  const de = inicio.toISOString().slice(0, 10);

  return historico.filter((ponto) => ponto.data >= de && ponto.data <= ate);
}

export function montarRelatorio(
  avaliacao: AvaliacaoParaRelatorio,
  historicoCompleto: PontoCmj[],
  semanas?: number,
) {
  const porCodigo = new Map(
    avaliacao.velocidades.map((linha) => [linha.codigo, linha]),
  );

  /**
   * Carga e tempo como o professor digitou, um item por exercicio do catalogo.
   * Nenhuma derivacao: e a diferenca em relacao a antiga `curva.pontos`, que
   * publicava uma velocidade obtida de um deslocamento chutado.
   *
   * Exercicio nao medido continua aparecendo, com os dois valores `null` — a
   * mesma regra das medidas. Some-lo faria a tabela do relatorio mudar de
   * tamanho conforme o preenchimento.
   */
  const velocidadeDetalhada = EXERCICIOS_VELOCIDADE.map((exercicio) => {
    const linha = porCodigo.get(exercicio.codigo);
    return {
      codigo: exercicio.codigo,
      nome: exercicio.nome,
      cargaKg: linha?.cargaKg ?? null,
      tempoSegundos: linha?.tempoSegundos ?? null,
    };
  });

  const dataAvaliacao = formatarData(avaliacao.dataAvaliacao);
  const historicoCmj = recortarHistorico(
    historicoCompleto,
    dataAvaliacao,
    semanas,
  );

  return {
    aluno: {
      id: avaliacao.aluno.id,
      nome: avaliacao.aluno.nome,
    },
    avaliacao: {
      id: avaliacao.id,
      dataAvaliacao,
      observacoes: avaliacao.observacoes,
    },
    periodo: {
      // `de`/`ate` sao os extremos do dado que existe, nao as bordas da
      // janela pedida — a janela pode comecar antes do primeiro registro.
      de: historicoCmj.at(0)?.data ?? dataAvaliacao,
      ate: historicoCmj.at(-1)?.data ?? dataAvaliacao,
      // ⚠️ Conta so avaliacoes COM CMJ, nao o total do aluno — ver api.md.
      totalAvaliacoes: historicoCmj.length,
      /**
       * Janela aplicada, em semanas, ou `null` quando o relatorio cobre o
       * historico inteiro. Existe pro front conseguir rotular a tela com
       * honestidade em vez de chutar o que os numeros significam.
       */
      semanas: semanas ?? null,
    },
    amplitude: linhasParaAmplitude(avaliacao.medidas),
    saltos: linhasParaSaltos(avaliacao.medidas),
    // Mesmo conteudo, achatado e com a sigla da planilha pronta pra imprimir.
    medidasDetalhadas: linhasParaMedidasDetalhadas(avaliacao.medidas),
    velocidade: linhasParaVelocidade(avaliacao.velocidades),
    // Mesmo conteudo, com o nome do exercicio pronto pra imprimir.
    velocidadeDetalhada,
    historicoCmj,
    resumoCmj: resumirCmj(historicoCmj),
    textos: textosPlaceholder(),
    // Deixa explicito pro front (e pra demo) o que ainda nao e real.
    // `curva` e `score` sairam daqui junto com as secoes que descreviam.
    provisorio: {
      textos: "Lorem ipsum",
    },
  };
}

/**
 * Contrato de saida da rota de relatorio. Derivado da montagem, nao declarado
 * a mao: mudar o formato aqui quebra o typecheck de quem consome, que e
 * exatamente a garantia que faltava (frontend-plan.md R3/D7).
 *
 * Todos os campos ja sao primitivos ou string — nenhum `Date` sobrevive ate a
 * resposta, entao o tipo vale igual antes e depois do JSON.
 */
export type RelatorioResponse = ReturnType<typeof montarRelatorio>;

export type ResumoCmjRelatorio = NonNullable<RelatorioResponse["resumoCmj"]>;

function resumirCmj(historico: PontoCmj[]) {
  if (historico.length === 0) return null;

  const inicial = historico[0];
  const atual = historico[historico.length - 1];
  const pico = historico.reduce((a, b) => (b.valor > a.valor ? b : a));

  return {
    inicial,
    pico,
    atual,
    variacaoVsInicial: Number((atual.valor - inicial.valor).toFixed(2)),
    variacaoVsPico: Number((atual.valor - pico.valor).toFixed(2)),
  };
}
