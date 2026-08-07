import type {
  RelatorioResponse,
  ResumoCmjRelatorio,
} from "@/lib/relatorio";

/**
 * Espelha a resposta de GET /avaliacoes/:id/relatorio.
 *
 * Antes este arquivo redigitava o envelope inteiro a mao, porque na epoca o
 * backend nao exportava um tipo do relatorio montado. Hoje exporta
 * (`lib/relatorio.ts`, `RelatorioResponse = ReturnType<typeof montarRelatorio>`),
 * e aquele modulo foi escrito de proposito sem tocar `@/lib/prisma` nem
 * `@/lib/http` justamente pra poder ser importado daqui sem arrastar nada
 * server-only. Entao passamos a reexportar em vez de duplicar.
 *
 * O ganho e o que o frontend-plan.md pede no risco R3: mudanca de formato no
 * backend quebra o typecheck aqui, em vez de a tela quebrar em runtime. A
 * versao redigitada nao cumpria isso — ela sobreviveu a remocao da curva
 * apontando pra `@/lib/calculos`, um modulo ja apagado.
 */
export type { RelatorioResponse, ResumoCmjRelatorio };

/** Um ponto do historico de CMJ: data formatada e valor em cm. */
export type PontoCmj = RelatorioResponse["historicoCmj"][number];

/** Uma linha da tabela de velocidade, com o nome do exercicio pronto. */
export type LinhaVelocidadeRelatorio =
  RelatorioResponse["velocidadeDetalhada"][number];
