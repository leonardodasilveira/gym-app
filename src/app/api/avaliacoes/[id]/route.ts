import {
  amplitudeParaLinhas,
  avaliacaoCompleta,
  CODIGOS_AMPLITUDE,
  CODIGOS_SALTO,
  paraData,
  saltosParaLinhas,
  serializarAvaliacao,
  velocidadeParaLinhas,
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
 * Os blocos sao regravados do zero em vez de reconciliados linha a linha. Com o
 * volume envolvido (9 medidas e 2 exercicios) a diferenca de custo e
 * irrelevante, e reconciliar exigiria casar registro do banco com item do
 * payload por `codigo`.
 *
 * `amplitude` e `saltos` moram na mesma tabela, entao cada delete e restrito aos
 * codigos do seu bloco (`CODIGOS_AMPLITUDE`/`CODIGOS_SALTO`). Um `deleteMany`
 * por `avaliacaoId` apagaria o bloco que o cliente nao mandou — que e
 * exatamente a diferenca entre "nao mandei" e "apaguei" que o contrato existe
 * pra manter separada.
 *
 * Tudo numa transacao: sem ela, um payload invalido apagaria o bloco antigo e
 * falharia na recriacao, deixando a avaliacao sem nada.
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
    if (dados.amplitude) {
      await tx.medida.deleteMany({
        where: { avaliacaoId: id, codigo: { in: CODIGOS_AMPLITUDE } },
      });
      await tx.medida.createMany({
        data: amplitudeParaLinhas(dados.amplitude).map((linha) => ({
          ...linha,
          avaliacaoId: id,
        })),
      });
    }

    if (dados.saltos) {
      await tx.medida.deleteMany({
        where: { avaliacaoId: id, codigo: { in: CODIGOS_SALTO } },
      });
      await tx.medida.createMany({
        data: saltosParaLinhas(dados.saltos).map((linha) => ({
          ...linha,
          avaliacaoId: id,
        })),
      });
    }

    if (dados.velocidade) {
      await tx.medidaVelocidade.deleteMany({ where: { avaliacaoId: id } });
      await tx.medidaVelocidade.createMany({
        data: velocidadeParaLinhas(dados.velocidade).map((linha) => ({
          ...linha,
          avaliacaoId: id,
        })),
      });
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
