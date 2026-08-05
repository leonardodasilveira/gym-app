import {
  formatarData,
  linhasParaAmplitude,
  linhasParaMedidasDetalhadas,
  linhasParaSaltos,
  type LinhaMedida,
  type LinhaVelocidade,
} from "@/lib/avaliacoes";
import {
  ajustarCurva,
  calcularScore,
  classificarPerfil,
  r2EhInformativo,
  velocidadeMedia,
  type PontoCurva,
} from "@/lib/calculos";
import { exercicioPorCodigo } from "@/lib/medidas";
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
 * ⚠️ Curva, score e textos sao provisorios — ver src/lib/calculos.ts e
 * src/lib/textos.ts.
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
  /**
   * ⚠️ Um ponto por exercicio — no maximo **2**, contra os 5 do seed v1 e os 8
   * da planilha real. O modelo v2 removeu as tentativas, e com elas a maior
   * parte da curva (evaluation-model-v2-proposal.md §9.4).
   *
   * Esta e a adaptacao mecanica que mantem a rota funcionando; **nao** e a
   * resposta ao bloqueio B2. O que fazer com as secoes do relatorio que foram
   * desenhadas sobre 8 pontos continua sendo decisao de produto, e ate ela vir
   * a resposta carrega `curva.suficiencia` dizendo a verdade sobre o que ali
   * dentro ainda significa alguma coisa.
   *
   * Exercicio com carga ou tempo faltando fica fora da curva em vez de virar
   * zero — mesma regra do CMJ ausente no historico. O schema ja garante que os
   * dois vem juntos ou nenhum vem, entao na pratica isto filtra o exercicio nao
   * medido.
   */
  const pontos: PontoCurva[] = avaliacao.velocidades
    .flatMap((linha) => {
      if (linha.cargaKg == null || linha.tempoSegundos == null) return [];
      return [
        {
          testeCodigo: linha.codigo,
          testeNome: exercicioPorCodigo(linha.codigo)?.nome ?? linha.codigo,
          cargaKg: linha.cargaKg,
          velocidadeMs: velocidadeMedia({
            codigo: linha.codigo,
            tempoSegundos: linha.tempoSegundos,
          }),
        },
      ];
    })
    .sort((a, b) => a.cargaKg - b.cargaKg);

  const ajuste = ajustarCurva(pontos);
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
    curva: {
      pontos,
      cargaMaximaKg: pontos.at(-1)?.cargaKg ?? null,
      ajuste,
      perfil: classificarPerfil(ajuste),
      /**
       * O que o front precisa saber pra nao apresentar como informacao algo que
       * nao e. Existe porque a alternativa — deixar o front deduzir de
       * `pontos.length` — espalharia a mesma regra por varios componentes.
       */
      suficiencia: {
        pontos: pontos.length,
        /** Com <2 pontos nao existe reta: `ajuste` vem `null`. */
        temAjuste: ajuste !== null,
        /** Com 2 pontos `r2` e sempre 1 por construcao — nao exibir como qualidade. */
        r2Informativo: r2EhInformativo(ajuste),
      },
    },
    historicoCmj,
    resumoCmj: resumirCmj(historicoCmj),
    score: calcularScore(ajuste),
    textos: textosPlaceholder(),
    // Deixa explicito pro front (e pra demo) o que ainda nao e real.
    provisorio: {
      curva:
        "Velocidade derivada de tempo com deslocamento estimado; no maximo 2 pontos no modelo v2",
      score: "Formula propria, sem validacao",
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
