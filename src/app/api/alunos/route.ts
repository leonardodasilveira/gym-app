import { formatarData } from "@/lib/avaliacoes";
import { handler, json, parseBody, parseQuery } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { criarAlunoSchema, listarAlunosQuerySchema } from "@/lib/schemas";

export const GET = handler(async (request) => {
  const { ativo, busca } = parseQuery(request, listarAlunosQuerySchema);

  const alunos = await prisma.aluno.findMany({
    where: {
      ativo,
      ...(busca ? { nome: { contains: busca } } : {}),
    },
    orderBy: { nome: "asc" },
    include: { _count: { select: { avaliacoes: true } } },
  });

  return json(
    alunos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome,
      dataNascimento: aluno.dataNascimento
        ? formatarData(aluno.dataNascimento)
        : null,
      ativo: aluno.ativo,
      totalAvaliacoes: aluno._count.avaliacoes,
    })),
  );
});

export const POST = handler(async (request) => {
  const { dataNascimento, ...dados } = await parseBody(
    request,
    criarAlunoSchema,
  );

  const aluno = await prisma.aluno.create({
    data: {
      ...dados,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
    },
  });

  return json(
    {
      id: aluno.id,
      nome: aluno.nome,
      dataNascimento: aluno.dataNascimento
        ? formatarData(aluno.dataNascimento)
        : null,
      ativo: aluno.ativo,
    },
    201,
  );
});
