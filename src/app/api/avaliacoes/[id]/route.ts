import { avaliacaoCompleta, serializarAvaliacao } from "@/lib/avaliacoes";
import { handler, json, naoEncontrado } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export const GET = handler(async (_request, { params }: Context) => {
  const { id } = await params;

  const avaliacao = await prisma.avaliacao.findUnique({
    where: { id },
    include: { ...avaliacaoCompleta, aluno: { select: { nome: true } } },
  });

  if (!avaliacao) throw naoEncontrado("Avaliacao nao encontrada");

  return json({
    ...serializarAvaliacao(avaliacao),
    alunoNome: avaliacao.aluno.nome,
  });
});

export const DELETE = handler(async (_request, { params }: Context) => {
  const { id } = await params;

  await prisma.avaliacao.delete({ where: { id } });

  return new Response(null, { status: 204 });
});
