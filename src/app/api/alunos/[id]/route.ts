import { formatarData } from "@/lib/avaliacoes";
import { handler, json, naoEncontrado, parseBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { atualizarAlunoSchema } from "@/lib/schemas";

type Context = { params: Promise<{ id: string }> };

export const GET = handler(async (_request, { params }: Context) => {
  const { id } = await params;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      avaliacoes: {
        orderBy: { dataAvaliacao: "desc" },
        select: { id: true, dataAvaliacao: true, observacoes: true },
      },
    },
  });

  if (!aluno) throw naoEncontrado("Aluno nao encontrado");

  return json({
    id: aluno.id,
    nome: aluno.nome,
    dataNascimento: aluno.dataNascimento
      ? formatarData(aluno.dataNascimento)
      : null,
    ativo: aluno.ativo,
    avaliacoes: aluno.avaliacoes.map((avaliacao) => ({
      id: avaliacao.id,
      dataAvaliacao: formatarData(avaliacao.dataAvaliacao),
      observacoes: avaliacao.observacoes,
    })),
  });
});

export const PATCH = handler(async (request, { params }: Context) => {
  const { id } = await params;
  const { dataNascimento, ...dados } = await parseBody(
    request,
    atualizarAlunoSchema,
  );

  const aluno = await prisma.aluno.update({
    where: { id },
    data: {
      ...dados,
      ...(dataNascimento !== undefined
        ? { dataNascimento: new Date(dataNascimento) }
        : {}),
    },
  });

  return json({
    id: aluno.id,
    nome: aluno.nome,
    dataNascimento: aluno.dataNascimento
      ? formatarData(aluno.dataNascimento)
      : null,
    ativo: aluno.ativo,
  });
});

export const DELETE = handler(async (_request, { params }: Context) => {
  const { id } = await params;

  await prisma.aluno.delete({ where: { id } });

  return new Response(null, { status: 204 });
});
