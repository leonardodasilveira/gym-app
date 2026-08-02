import { avaliacaoCompleta, formatarData } from "@/lib/avaliacoes";
import { handler, json, naoEncontrado } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { montarRelatorio, type PontoCmj } from "@/lib/relatorio";

type Context = { params: Promise<{ id: string }> };

/**
 * Dados do relatorio de performance de uma avaliacao. A montagem da resposta
 * (e o tipo `RelatorioResponse`, consumido pelo front) vive em
 * `src/lib/relatorio.ts`; aqui fica so a busca no banco.
 */
export const GET = handler(async (_request, { params }: Context) => {
  const { id } = await params;

  const avaliacao = await prisma.avaliacao.findUnique({
    where: { id },
    include: { ...avaliacaoCompleta, aluno: true },
  });

  if (!avaliacao) throw naoEncontrado("Avaliacao nao encontrada");

  const historico = await historicoCmj(avaliacao.alunoId);

  return json(montarRelatorio(avaliacao, historico));
});

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
