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
 *
 * ## Formato v2
 *
 * As tentativas do seed v1 foram descartadas junto com as tabelas `Teste` e
 * `Tentativa`. Nao havia como escolher automaticamente "a melhor" — a escolha e
 * do professor e acontece fora do sistema —, e inventar um criterio (maior
 * carga? menor tempo?) seria fabricar dado
 * (evaluation-model-v2-proposal.md §13).
 *
 * A contagem por aluno e preservada de proposito: Ana 8, Bruno 5, Carla 3. E o
 * que o front usa pra conferir listagem, paginacao e historico, e mudar o numero
 * junto com o formato dificultaria saber qual dos dois quebrou alguma tela.
 */

const ALUNOS = [
  { nome: "Ana Prado", dataNascimento: "1998-03-14", avaliacoes: 8 },
  { nome: "Bruno Tavares", dataNascimento: "2001-11-02", avaliacoes: 5 },
  { nome: "Carla Menezes", dataNascimento: "1995-07-21", avaliacoes: 3 },
];

const AMPLITUDE_BASE = {
  MOBILIDADE_TORNOZELO: { direito: 11.5, esquerdo: 12.1 },
  MOBILIDADE_QUADRIL: { direito: 18.4, esquerdo: 17.8 },
  AMPLITUDE_ISQUIOTIBIAIS: { direito: 21.0, esquerdo: 20.7 },
  SLB: { direito: 32.5, esquerdo: 31.9 },
};

/**
 * Fatores aplicados ao CMJ pra derivar os outros quatro saltos.
 *
 * ⚠️ Sao numeros PLAUSIVEIS, nao medidos, e nao afirmam unidade nenhuma: a
 * coluna `unidade` destes quatro codigos e `NULL` ate o cliente responder o
 * bloqueio B6. Se a resposta for que algum deles e razao ou percentual, estes
 * valores mudam de escala — por isso ficam isolados numa constante so.
 */
const FATOR_SALTO = {
  SALTO_2: 0.89,
  SALTO_3: 0.82,
  SALTO_4: 0.71,
  SALTO_5: 0.68,
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
          observacoes:
            i === dadosAluno.avaliacoes - 1 ? "Avaliacao de exemplo." : null,
          medidas: {
            create: [
              ...Object.entries(AMPLITUDE_BASE).map(([codigo, lados]) => ({
                codigo,
                unidade: "cm",
                direito: Number((lados.direito * ganho).toFixed(1)),
                esquerdo: Number((lados.esquerdo * ganho).toFixed(1)),
                valor: null,
              })),
              {
                codigo: "CMJ",
                unidade: "cm",
                direito: null,
                esquerdo: null,
                valor: cmj,
              },
              ...Object.entries(FATOR_SALTO).map(([codigo, fator]) => ({
                codigo,
                // NULL de proposito: unidade desconhecida (bloqueio B6).
                unidade: null,
                direito: null,
                esquerdo: null,
                valor: Number((cmj * fator).toFixed(2)),
              })),
            ],
          },
          // Dois exercicios, um par carga/tempo cada — o maximo que o modelo v2
          // produz. Cargas distintas de proposito: com as duas iguais a
          // regressao nao tem solucao e `ajustarCurva` devolve `null`.
          velocidades: {
            create: [
              {
                codigo: "SQUAT_JUMP",
                cargaKg: 20,
                tempoSegundos: Number((1.43 / ganho).toFixed(2)),
              },
              {
                codigo: "AGACHAMENTO",
                cargaKg: 60,
                tempoSegundos: Number((1.91 / ganho).toFixed(2)),
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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
