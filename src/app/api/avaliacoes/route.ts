import {
  avaliacaoCompleta,
  medidasParaLinhas,
  paraData,
  serializarAvaliacao,
  testesParaCriacao,
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

/** Recebe o CriarAvaliacaoDTO combinado com o front. */
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
      medidas: { create: medidasParaLinhas(dados.medidas) },
      testes: { create: testesParaCriacao(dados.testes) },
    },
    include: avaliacaoCompleta,
  });

  return json(serializarAvaliacao(avaliacao), 201);
});
