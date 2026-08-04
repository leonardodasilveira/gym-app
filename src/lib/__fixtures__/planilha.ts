/**
 * Dados REAIS do cliente, transcritos do levantamento em docs/planilha-atual.md.
 *
 * Nao inventar valor aqui. Tudo neste arquivo foi lido das fotos da planilha
 * `2026 - CT E PERFORM_NEW.xlsx` e do relatorio de performance que vieram em
 * 30/07/2026, e cada constante aponta a linha do documento de onde saiu.
 *
 * Serve pra duas coisas:
 *
 * 1. Testar os calculos contra a curva de verdade, e nao contra numero de seed.
 * 2. Guardar o alvo. As formulas em src/lib/calculos.ts sao provisorias e vao
 *    ser trocadas quando o `.xlsx` chegar; quando isso acontecer, o criterio de
 *    pronto e o teste em calculos.test.ts passar contra RELATORIO_PUBLICADO.
 */

import type { PontoCurva } from "@/lib/calculos";

/**
 * Linha 1001 da planilha — avaliacao de 30/04/2026, o caso mais completo que o
 * material mostra (docs/planilha-atual.md:35-41).
 *
 * Sao os 8 pontos plotados no grafico "Curva Forca-Velocidade – Atual" do
 * relatorio, conferidos contra os campos "N de pontos da curva: 8" e "Carga
 * maxima testada: 70 kg". E a unica evidencia do repositorio com verificacao
 * cruzada entre planilha e relatorio.
 *
 * Atencao ao que a planilha guarda: pares (carga, **VMP**). Velocidade medida,
 * nao tempo. O contrato atual da API pede tempo + repeticoes e deriva a
 * velocidade com um deslocamento chutado (duvida 11) — por isso estes pontos
 * entram direto em `ajustarCurva`, sem passar por `velocidadeMedia`.
 */
export const PONTOS_LINHA_1001: PontoCurva[] = [
  { cargaKg: 20, velocidadeMs: 1.5 },
  { cargaKg: 40, velocidadeMs: 1.22 },
  { cargaKg: 45, velocidadeMs: 1.12 },
  { cargaKg: 50, velocidadeMs: 1.1 },
  { cargaKg: 55, velocidadeMs: 0.96 },
  { cargaKg: 60, velocidadeMs: 0.98 },
  { cargaKg: 65, velocidadeMs: 0.96 },
  { cargaKg: 70, velocidadeMs: 0.93 },
].map((ponto) => ({ testeCodigo: "AGACHAMENTO", testeNome: "Agachamento", ...ponto }));

/**
 * O que a secao "Analise tecnica" do relatorio do professor publica para essa
 * mesma avaliacao (docs/planilha-atual.md:106-113).
 *
 * NAO e o resultado de uma regressao sobre os 8 pontos acima — e justamente o
 * "buraco" descrito no documento. Fica aqui como alvo a atingir, nao como
 * expectativa do codigo de hoje.
 */
export const RELATORIO_PUBLICADO = {
  inclinacao: -0.01,
  v0: 1.88,
  f0: 122.1,
  nPontosDaCurva: 8,
  cargaMaximaKg: 70,
} as const;
