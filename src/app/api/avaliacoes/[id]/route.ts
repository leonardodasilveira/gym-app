import {
  avaliacaoCompleta,
  medidasParaLinhas,
  paraData,
  serializarAvaliacao,
  testesParaCriacao,
} from "@/lib/avaliacoes";
import { handler, json, naoEncontrado, parseBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { atualizarAvaliacaoSchema } from "@/lib/schemas";

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

/**
 * Edita a avaliacao. Cada bloco enviado substitui o bloco inteiro; bloco omitido
 * fica como estava — ver `atualizarAvaliacaoSchema`.
 *
 * Medidas e testes sao regravados do zero em vez de reconciliados linha a linha.
 * Com o volume envolvido (9 medidas e um punhado de testes) a diferenca de custo
 * e irrelevante, e reconciliacao exigiria casar registro do banco com item do
 * payload por `codigo` — que e justamente o par que o cliente pode ter mudado.
 *
 * Tudo numa transacao: sem ela, um payload de testes invalido apagaria os testes
 * antigos e falharia na recriacao, deixando a avaliacao sem nada.
 */
export const PATCH = handler(async (request, { params }: Context) => {
  const { id } = await params;
  const dados = await parseBody(request, atualizarAvaliacaoSchema);

  const existe = await prisma.avaliacao.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existe) throw naoEncontrado("Avaliacao nao encontrada");

  const avaliacao = await prisma.$transaction(async (tx) => {
    if (dados.medidas) {
      await tx.medida.deleteMany({ where: { avaliacaoId: id } });
      await tx.medida.createMany({
        data: medidasParaLinhas(dados.medidas).map((linha) => ({
          ...linha,
          avaliacaoId: id,
        })),
      });
    }

    if (dados.testes) {
      // As tentativas caem junto por cascata (schema.prisma, Tentativa.teste).
      await tx.teste.deleteMany({ where: { avaliacaoId: id } });

      for (const teste of testesParaCriacao(dados.testes)) {
        await tx.teste.create({ data: { ...teste, avaliacaoId: id } });
      }
    }

    return tx.avaliacao.update({
      where: { id },
      data: {
        // `undefined` mantem o valor atual. Em `observacoes`, `null` limpa.
        dataAvaliacao: dados.dataAvaliacao
          ? paraData(dados.dataAvaliacao)
          : undefined,
        observacoes: dados.observacoes,
      },
      include: avaliacaoCompleta,
    });
  });

  return json(serializarAvaliacao(avaliacao));
});

export const DELETE = handler(async (_request, { params }: Context) => {
  const { id } = await params;

  await prisma.avaliacao.delete({ where: { id } });

  return new Response(null, { status: 204 });
});
