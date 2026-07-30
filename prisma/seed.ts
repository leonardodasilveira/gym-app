import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

/**
 * Dados ficticios pro front ter o que renderizar. Nada aqui e de atleta real.
 * Gera um historico de avaliacoes com evolucao plausivel: CMJ subindo e depois
 * estabilizando, cargas aumentando e tempos melhorando de leve.
 */

const ALUNOS = [
  { nome: "Ana Prado", dataNascimento: "1998-03-14", avaliacoes: 8 },
  { nome: "Bruno Tavares", dataNascimento: "2001-11-02", avaliacoes: 5 },
  { nome: "Carla Menezes", dataNascimento: "1995-07-21", avaliacoes: 3 },
];

const MEDIDAS_BASE = {
  MOBILIDADE_TORNOZELO: { direito: 11.5, esquerdo: 12.1 },
  MOBILIDADE_QUADRIL: { direito: 18.4, esquerdo: 17.8 },
  AMPLITUDE_ISQUIOTIBIAIS: { direito: 21.0, esquerdo: 20.7 },
  SLB: { direito: 32.5, esquerdo: 31.9 },
};

function dataDaAvaliacao(indice: number, total: number): Date {
  // Uma avaliacao a cada ~6 semanas, terminando em 30/04/2026.
  const fim = Date.UTC(2026, 3, 30);
  const semanas = (total - 1 - indice) * 6;
  return new Date(fim - semanas * 7 * 24 * 60 * 60 * 1000);
}

async function main() {
  await prisma.aluno.deleteMany();

  for (const dadosAluno of ALUNOS) {
    const aluno = await prisma.aluno.create({
      data: {
        nome: dadosAluno.nome,
        dataNascimento: new Date(`${dadosAluno.dataNascimento}T00:00:00.000Z`),
      },
    });

    for (let i = 0; i < dadosAluno.avaliacoes; i++) {
      const progresso = i / Math.max(dadosAluno.avaliacoes - 1, 1);
      // Sobe ate ~70% do periodo e recua um pouco no fim.
      const curva = Math.sin(progresso * Math.PI * 0.8);
      const cmj = Number((40 + curva * 6).toFixed(2));
      const ganho = 1 + progresso * 0.08;

      await prisma.avaliacao.create({
        data: {
          alunoId: aluno.id,
          dataAvaliacao: dataDaAvaliacao(i, dadosAluno.avaliacoes),
          observacoes: i === dadosAluno.avaliacoes - 1 ? "Avaliacao de exemplo." : null,
          medidas: {
            create: [
              ...Object.entries(MEDIDAS_BASE).map(([codigo, lados]) => ({
                codigo,
                unidade: "cm",
                direito: Number((lados.direito * ganho).toFixed(1)),
                esquerdo: Number((lados.esquerdo * ganho).toFixed(1)),
                valor: null,
              })),
              { codigo: "CMJ", unidade: "cm", direito: null, esquerdo: null, valor: cmj },
            ],
          },
          testes: {
            create: [
              {
                codigo: "SALTO_AGACHADO",
                nome: "SJ",
                ordem: 0,
                tentativas: {
                  create: [
                    tentativa(1, 2, 20, 1.43 / ganho),
                    tentativa(2, 2, 30, 1.59 / ganho),
                  ],
                },
              },
              {
                codigo: "AGACHAMENTO",
                nome: "Agachamento",
                ordem: 1,
                tentativas: {
                  create: [
                    tentativa(1, 8, 40, 9.8 / ganho),
                    tentativa(2, 8, 50, 10.6 / ganho),
                    tentativa(3, 8, 60, 11.9 / ganho),
                  ],
                },
              },
            ],
          },
        },
      });
    }
  }

  const totalAlunos = await prisma.aluno.count();
  const totalAvaliacoes = await prisma.avaliacao.count();
  console.log(`Seed ok: ${totalAlunos} alunos e ${totalAvaliacoes} avaliacoes.`);
}

function tentativa(
  ordem: number,
  repeticoes: number,
  cargaKg: number,
  tempoS: number,
) {
  return {
    ordem,
    repeticoes,
    cargaValor: cargaKg,
    cargaUnidade: "kg",
    tempoValor: Number(tempoS.toFixed(2)),
    tempoUnidade: "s",
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
