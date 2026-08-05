import {
  avaliacaoCompleta,
  medidasParaLinhas,
  paraData,
  serializarAvaliacao,
  velocidadeParaLinhas,
} from "@/lib/avaliacoes";
import { handler, json, naoEncontrado, parseBody, parseQuery } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  criarAvaliacaoSchema,
  listarAvaliacoesQuerySchema,
} from "@/lib/schemas";

export const GET = handler(async (request) => {
  const { alunoId, limite } = parseQuery(request, listarAvaliacoesQuerySchema);

  const avaliacoes = await prisma.avaliacao.findMany({
    where: { alunoId },
    orderBy: { dataAvaliacao: "desc" },
    take: limite,
    include: { ...avaliacaoCompleta, aluno: { select: { nome: true } } },
  });

  return json(
    avaliacoes.map((avaliacao) => ({
      ...serializarAvaliacao(avaliacao),
      alunoNome: avaliacao.aluno.nome,
    })),
  );
});

/**
 * Recebe o CriarAvaliacaoDTO v2 combinado com o front: tres blocos de chaves
 * fixas, sem tentativas e sem unidade no payload.
 *
 * Nao existe mais colisao de codigo possivel neste fluxo — os codigos saem do
 * catalogo, nao do cliente —, entao o 409 por `@@unique` deixou de ser
 * alcancavel aqui (evaluation-model-v2-proposal.md §6.4).
 */
export const POST = handler(async (request) => {
  const dados = await parseBody(request, criarAvaliacaoSchema);

  const aluno = await prisma.aluno.findUnique({
    where: { id: dados.alunoId },
    select: { id: true },
  });

  if (!aluno) throw naoEncontrado("Aluno nao encontrado");

  const avaliacao = await prisma.avaliacao.create({
    data: {
      alunoId: dados.alunoId,
      dataAvaliacao: paraData(dados.dataAvaliacao),
      observacoes: dados.observacoes ?? null,
      medidas: { create: medidasParaLinhas(dados.amplitude, dados.saltos) },
      velocidades: { create: velocidadeParaLinhas(dados.velocidade) },
    },
    include: avaliacaoCompleta,
  });

  return json(serializarAvaliacao(avaliacao), 201);
});
