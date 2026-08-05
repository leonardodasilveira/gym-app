/**
 * Dados REAIS do cliente, transcritos do levantamento em docs/planilha-atual.md.
 *
 * Nao inventar valor aqui. Tudo neste arquivo foi lido das fotos da planilha
 * `2026 - CT E PERFORM_NEW.xlsx` e do relatorio de performance que vieram em
 * 30/07/2026, e cada constante aponta a linha do documento de onde saiu.
 *
 * ## Por que este arquivo existe sem ninguem importar (05/08/2026)
 *
 * Ate 05/08/2026 estes dados alimentavam `src/lib/calculos.test.ts`, que testava
 * a regressao carga x velocidade contra a curva de verdade em vez de contra
 * numero de seed. Nesse dia a curva forca-velocidade **saiu do produto**: o
 * modelo v2 reduziu a curva de 8 pontos para no maximo 2, e com 2 pontos a reta
 * e exata por construcao (ver src/lib/relatorio.ts). `calculos.ts` e o teste
 * foram apagados junto.
 *
 * **Isto aqui nao foi.** Estes numeros nao sao codigo de produto: sao a unica
 * transcricao que existe no repositorio das fotos da planilha, com verificacao
 * cruzada entre a planilha e o relatorio publicado. Recuperar isso das fotos de
 * novo custa caro; recuperar uma regressao linear do git nao custa nada. Se a
 * curva voltar — com as formulas reais, quando o `.xlsx` chegar — este arquivo e
 * o alvo contra o qual medir.
 *
 * O tipo dos pontos e declarado aqui de proposito, em vez de importado: o
 * arquivo precisa se sustentar sozinho agora que `@/lib/calculos` nao existe.
 */

export type PontoCargaVelocidade = {
  cargaKg: number;
  /** VMP medida por encoder, em m/s. Medida, nao derivada de tempo. */
  velocidadeMs: number;
};

/**
 * Linha 1001 da planilha — avaliacao de 30/04/2026, o caso mais completo que o
 * material mostra (docs/planilha-atual.md:35-41).
 *
 * Sao os 8 pontos plotados no grafico "Curva Forca-Velocidade – Atual" do
 * relatorio, conferidos contra os campos "N de pontos da curva: 8" e "Carga
 * maxima testada: 70 kg". E a unica evidencia do repositorio com verificacao
 * cruzada entre planilha e relatorio.
 *
 * Atencao ao que a planilha guarda: pares (carga, **VMP**). Velocidade medida
 * por encoder, nao tempo. O contrato da API pede `tempoSegundos` — a divergencia
 * segue aberta como duvida 6 de evaluation-model-v2-proposal.md secao 15.
 */
export const PONTOS_LINHA_1001: PontoCargaVelocidade[] = [
  { cargaKg: 20, velocidadeMs: 1.5 },
  { cargaKg: 40, velocidadeMs: 1.22 },
  { cargaKg: 45, velocidadeMs: 1.12 },
  { cargaKg: 50, velocidadeMs: 1.1 },
  { cargaKg: 55, velocidadeMs: 0.96 },
  { cargaKg: 60, velocidadeMs: 0.98 },
  { cargaKg: 65, velocidadeMs: 0.96 },
  { cargaKg: 70, velocidadeMs: 0.93 },
];

/**
 * O que a secao "Analise tecnica" do relatorio do professor publica para essa
 * mesma avaliacao (docs/planilha-atual.md:106-113).
 *
 * NAO e o resultado de uma regressao sobre os 8 pontos acima — e justamente o
 * "buraco" descrito no documento.
 */
export const RELATORIO_PUBLICADO = {
  inclinacao: -0.01,
  v0: 1.88,
  f0: 122.1,
  nPontosDaCurva: 8,
  cargaMaximaKg: 70,
} as const;

/**
 * ## O "buraco", registrado em prosa
 *
 * Isto estava fixado em testes ate 05/08/2026. Com `calculos.ts` apagado nao ha
 * mais o que executar, mas as tres constatacoes continuam valendo e sao o motivo
 * de os numeros do professor nao poderem ser reproduzidos por engenharia
 * reversa. Ficam escritas aqui para nao se perderem junto com o codigo.
 *
 * **1. A regressao simples nao chega nos numeros publicados.**
 * Minimos quadrados sobre os 8 pontos acima da inclinacao -0,01167, V0 1,687 e
 * F0 144,5. O relatorio publica -0,01, 1,88 e 122,1. F0 erra por mais de 20 kg
 * e V0 por quase 0,2 m/s — diferenca grande demais pra arredondamento.
 *
 * **2. Os numeros do proprio relatorio nao fecham entre si.**
 * Pela definicao de F0 (onde a reta cruza velocidade zero), F0 teria que ser
 * V0 / |inclinacao| = 1,88 / 0,01 = **188**. O relatorio publica **122,1**.
 * Evidencia de que ele mistura dois modelos: a hipotese registrada em
 * docs/planilha-atual.md:100-125 e que V0/F0/Pmax saiam de um perfil
 * forca-velocidade (Samozino), e nao desta reta.
 *
 * **3. Com 8 pontos o r2 media alguma coisa; com 2 nao mediria.**
 * A regressao sobre estes 8 pontos da r2 = 0,939 — abaixo de 1, porque sobra
 * dispersao pra medir. E o contraste que condenou a curva no modelo v2, onde
 * sobram no maximo 2 pontos e o r2 daria 1 por construcao.
 *
 * Criterio de pronto, se as formulas reais chegarem: reproduzir
 * `RELATORIO_PUBLICADO` a partir de `PONTOS_LINHA_1001` mais o que vier no
 * `.xlsx` (massa corporal e distancia de push-off, provavelmente).
 */
