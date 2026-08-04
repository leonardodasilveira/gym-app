import { describe, expect, test } from "vitest";

import { medidasParaLinhas, paraData } from "@/lib/avaliacoes";
import { montarRelatorio, type AvaliacaoParaRelatorio, type PontoCmj } from "@/lib/relatorio";
import type { MedidasDTO } from "@/lib/schemas";

const MEDIDAS_VAZIAS: MedidasDTO = {
  mobilidadeTornozelo: { unidade: "cm", direito: null, esquerdo: null },
  mobilidadeQuadril: { unidade: "cm", direito: null, esquerdo: null },
  amplitudeIsquiotibiais: { unidade: "cm", direito: null, esquerdo: null },
  slb: { unidade: "cm", direito: null, esquerdo: null },
  cmj: { unidade: "cm", valor: 42.8 },
};

const tentativa = (repeticoes: number, cargaValor: number, tempoValor: number) => ({
  repeticoes,
  cargaValor,
  tempoValor,
});

const avaliacao = (
  parcial: Partial<AvaliacaoParaRelatorio> = {},
): AvaliacaoParaRelatorio => ({
  id: "aval-1",
  dataAvaliacao: paraData("2026-04-30"),
  observacoes: null,
  aluno: { id: "aluno-1", nome: "Atleta de teste" },
  medidas: medidasParaLinhas(MEDIDAS_VAZIAS),
  testes: [
    {
      codigo: "AGACHAMENTO",
      nome: "Agachamento",
      tentativas: [tentativa(8, 40, 9.8), tentativa(8, 60, 11.9)],
    },
  ],
  ...parcial,
});

const HISTORICO: PontoCmj[] = [
  { data: "2025-06-10", valor: 38.2 },
  { data: "2026-01-15", valor: 44.1 },
  { data: "2026-03-20", valor: 41.5 },
  { data: "2026-04-30", valor: 42.8 },
];

describe("janela de semanas do relatorio", () => {
  test("sem o parametro, cobre o historico inteiro", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(relatorio.historicoCmj).toHaveLength(4);
    expect(relatorio.periodo).toMatchObject({
      de: "2025-06-10",
      ate: "2026-04-30",
      semanas: null,
    });
  });

  test("com semanas, recorta a janela terminando na data da avaliacao", () => {
    // 8 semanas antes de 30/04/2026 e 05/03/2026: sobram os dois ultimos pontos.
    const relatorio = montarRelatorio(avaliacao(), HISTORICO, 8);

    expect(relatorio.historicoCmj.map((p) => p.data)).toEqual([
      "2026-03-20",
      "2026-04-30",
    ]);
    expect(relatorio.periodo.semanas).toBe(8);
  });

  test("de/ate sao os extremos do dado, nao as bordas da janela pedida", () => {
    // Janela de 10 anos comecando muito antes do primeiro registro.
    const relatorio = montarRelatorio(avaliacao(), HISTORICO, 520);

    expect(relatorio.periodo.de).toBe("2025-06-10");
    expect(relatorio.periodo.ate).toBe("2026-04-30");
  });

  test("janela sem nenhum registro nao quebra o periodo", () => {
    const relatorio = montarRelatorio(avaliacao(), [], 8);

    expect(relatorio.historicoCmj).toEqual([]);
    expect(relatorio.resumoCmj).toBeNull();
    expect(relatorio.periodo).toMatchObject({ de: "2026-04-30", ate: "2026-04-30" });
  });

  test("totalAvaliacoes conta so o historico com CMJ, nao o total do aluno", () => {
    // Comportamento documentado e ainda em aberto (pendencia D2 do api.md).
    // Fixado aqui pra que mudar isso seja decisao, e nao acidente.
    const relatorio = montarRelatorio(avaliacao(), HISTORICO, 8);

    expect(relatorio.periodo.totalAvaliacoes).toBe(2);
  });
});

describe("resumo do CMJ", () => {
  test("inicial, pico e atual saem da serie recortada", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(relatorio.resumoCmj).toMatchObject({
      inicial: { data: "2025-06-10", valor: 38.2 },
      pico: { data: "2026-01-15", valor: 44.1 },
      atual: { data: "2026-04-30", valor: 42.8 },
      variacaoVsInicial: 4.6,
      variacaoVsPico: -1.3,
    });
  });
});

/**
 * Ligacao direta entre o modelo de dados e o relatorio: a curva so existe com
 * pontos de carga distintos suficientes. Vale ter isso em teste porque a
 * quantidade de pontos por avaliacao e exatamente a decisao de modelagem em
 * aberto (docs/evaluation-model-v2-proposal.md secao 9.4).
 */
describe("curva dentro do relatorio", () => {
  test("os pontos saem ordenados por carga", () => {
    const relatorio = montarRelatorio(
      avaliacao({
        testes: [
          {
            codigo: "AGACHAMENTO",
            nome: "Agachamento",
            tentativas: [tentativa(8, 60, 11.9), tentativa(8, 40, 9.8)],
          },
        ],
      }),
      HISTORICO,
    );

    expect(relatorio.curva.pontos.map((p) => p.cargaKg)).toEqual([40, 60]);
    expect(relatorio.curva.cargaMaximaKg).toBe(60);
  });

  test("um unico ponto de carga deixa o relatorio sem curva", () => {
    const relatorio = montarRelatorio(
      avaliacao({
        testes: [
          {
            codigo: "AGACHAMENTO",
            nome: "Agachamento",
            tentativas: [tentativa(8, 60, 11.9)],
          },
        ],
      }),
      HISTORICO,
    );

    expect(relatorio.curva.ajuste).toBeNull();
    expect(relatorio.curva.perfil).toBe("Dados insuficientes");
    expect(relatorio.score).toEqual({ valor: 0, nivel: "Sem dados" });
  });

  test("avaliacao sem nenhum teste tambem fica sem curva", () => {
    const relatorio = montarRelatorio(avaliacao({ testes: [] }), HISTORICO);

    expect(relatorio.curva.pontos).toEqual([]);
    expect(relatorio.curva.cargaMaximaKg).toBeNull();
    expect(relatorio.curva.ajuste).toBeNull();
  });
});

describe("o que o relatorio marca como provisorio", () => {
  test("a resposta declara explicitamente o que ainda nao e real", () => {
    // Se alguem implementar a formula de verdade e esquecer de tirar o aviso,
    // o front continua exibindo "provisorio" pra dado bom. Este teste lembra.
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(Object.keys(relatorio.provisorio)).toEqual(["curva", "score", "textos"]);
  });
});
