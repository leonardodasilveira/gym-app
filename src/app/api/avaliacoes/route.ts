import {
  avaliacaoCompleta,
  medidasParaLinhas,
  paraData,
  serializarAvaliacao,
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
      testes: {
        create: dados.testes.map((teste, indice) => ({
          codigo: teste.codigo,
          nome: teste.nome,
          ordem: indice,
          tentativas: {
            create: teste.tentativas.map((tentativa) => ({
              ordem: tentativa.ordem,
              repeticoes: tentativa.repeticoes,
              cargaValor: tentativa.carga.valor,
              cargaUnidade: tentativa.carga.unidade,
              tempoValor: tentativa.tempo.valor,
              tempoUnidade: tentativa.tempo.unidade,
            })),
          },
        })),
      },
    },
    include: avaliacaoCompleta,
  });

  return json(serializarAvaliacao(avaliacao), 201);
});
