import {
  avaliacaoCompleta,
  formatarData,
  linhasParaMedidas,
  linhasParaMedidasDetalhadas,
} from "@/lib/avaliacoes";
import {
  ajustarCurva,
  calcularScore,
  classificarPerfil,
  velocidadeMedia,
  type PontoCurva,
} from "@/lib/calculos";
import { handler, json, naoEncontrado } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { textosPlaceholder } from "@/lib/textos";

type Context = { params: Promise<{ id: string }> };

/**
 * Dados do relatorio de performance de uma avaliacao.
 *
 * ⚠️ Curva, score e textos sao provisorios — ver src/lib/calculos.ts e
 * src/lib/textos.ts. O objetivo aqui e o front ter o layout pra montar.
 */
export const GET = handler(async (_request, { params }: Context) => {
  const { id } = await params;

  const avaliacao = await prisma.avaliacao.findUnique({
    where: { id },
    include: { ...avaliacaoCompleta, aluno: true },
  });

  if (!avaliacao) throw naoEncontrado("Avaliacao nao encontrada");

  // Um ponto por tentativa: todas as cargas de todos os testes entram na mesma
  // curva, como o professor faz hoje na planilha (SJ nas cargas leves, depois
  // agachamento nas pesadas).
  const pontos: PontoCurva[] = avaliacao.testes
    .flatMap((teste) =>
      teste.tentativas.map((tentativa) => ({
        testeCodigo: teste.codigo,
        testeNome: teste.nome,
        cargaKg: tentativa.cargaValor,
        velocidadeMs: velocidadeMedia({
          codigo: teste.codigo,
          repeticoes: tentativa.repeticoes,
          tempoSegundos: tentativa.tempoValor,
        }),
      })),
    )
    .sort((a, b) => a.cargaKg - b.cargaKg);

  const ajuste = ajustarCurva(pontos);

  const historico = await historicoCmj(avaliacao.alunoId);

  return json({
    aluno: {
      id: avaliacao.aluno.id,
      nome: avaliacao.aluno.nome,
    },
    avaliacao: {
      id: avaliacao.id,
      dataAvaliacao: formatarData(avaliacao.dataAvaliacao),
      observacoes: avaliacao.observacoes,
    },
    periodo: {
      de: historico.at(0)?.data ?? formatarData(avaliacao.dataAvaliacao),
      ate: historico.at(-1)?.data ?? formatarData(avaliacao.dataAvaliacao),
      totalAvaliacoes: historico.length,
    },
    medidas: linhasParaMedidas(avaliacao.medidas),
    // Mesmo conteudo, achatado e com a sigla da planilha pronta pra imprimir.
    medidasDetalhadas: linhasParaMedidasDetalhadas(avaliacao.medidas),
    curva: {
      pontos,
      cargaMaximaKg: pontos.at(-1)?.cargaKg ?? null,
      ajuste,
      perfil: classificarPerfil(ajuste),
    },
    historicoCmj: historico,
    resumoCmj: resumirCmj(historico),
    score: calcularScore(ajuste),
    textos: textosPlaceholder(),
    // Deixa explicito pro front (e pra demo) o que ainda nao e real.
    provisorio: {
      curva: "Velocidade derivada de tempo/repeticoes com deslocamento estimado",
      score: "Formula propria, sem validacao",
      textos: "Lorem ipsum",
    },
  });
});

type PontoCmj = { data: string; valor: number };

/** Serie historica do CMJ do aluno, da avaliacao mais antiga pra mais recente. */
async function historicoCmj(alunoId: string): Promise<PontoCmj[]> {
  const avaliacoes = await prisma.avaliacao.findMany({
    where: { alunoId },
    orderBy: { dataAvaliacao: "asc" },
    select: {
      dataAvaliacao: true,
      medidas: { where: { codigo: "CMJ" }, select: { valor: true } },
    },
  });

  return avaliacoes.flatMap((avaliacao) => {
    const valor = avaliacao.medidas.at(0)?.valor;
    // Sem CMJ medido nessa avaliacao: fica fora da serie em vez de virar zero.
    if (valor == null) return [];
    return [{ data: formatarData(avaliacao.dataAvaliacao), valor }];
  });
}

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
