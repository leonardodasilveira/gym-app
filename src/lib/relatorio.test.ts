import { describe, expect, test } from "vitest";

import { medidasParaLinhas, paraData } from "@/lib/avaliacoes";
import {
  montarRelatorio,
  type AvaliacaoParaRelatorio,
  type PontoCmj,
} from "@/lib/relatorio";
import type { AmplitudeDTO, SaltosDTO } from "@/lib/schemas";

const AMPLITUDE_VAZIA: AmplitudeDTO = {
  tornozelo: { direito: null, esquerdo: null },
  quadril: { direito: null, esquerdo: null },
  isquiotibiais: { direito: null, esquerdo: null },
  slb: { direito: null, esquerdo: null },
};

const SALTOS: SaltosDTO = {
  cmj: 42.8,
  salto2: null,
  salto3: null,
  salto4: null,
  salto5: null,
};

const avaliacao = (
  parcial: Partial<AvaliacaoParaRelatorio> = {},
): AvaliacaoParaRelatorio => ({
  id: "aval-1",
  dataAvaliacao: paraData("2026-04-30"),
  observacoes: null,
  aluno: { id: "aluno-1", nome: "Atleta de teste" },
  medidas: medidasParaLinhas(AMPLITUDE_VAZIA, SALTOS),
  velocidades: [
    { codigo: "SQUAT_JUMP", cargaKg: 40, tempoSegundos: 9.8 },
    { codigo: "AGACHAMENTO", cargaKg: 60, tempoSegundos: 11.9 },
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
 * Ligacao direta entre o modelo de dados e o relatorio. No v2 sobram no maximo
 * DOIS pontos de carga — um por exercicio —, contra 5 do seed v1 e 8 da
 * planilha real. Estes testes fixam o que a rota faz hoje; o que o produto quer
 * fazer com isso e o bloqueio B2, ainda em aberto
 * (docs/evaluation-model-v2-proposal.md secao 9.4).
 */
describe("curva dentro do relatorio", () => {
  test("os pontos saem ordenados por carga", () => {
    const relatorio = montarRelatorio(
      avaliacao({
        velocidades: [
          { codigo: "AGACHAMENTO", cargaKg: 60, tempoSegundos: 11.9 },
          { codigo: "SQUAT_JUMP", cargaKg: 40, tempoSegundos: 9.8 },
        ],
      }),
      HISTORICO,
    );

    expect(relatorio.curva.pontos.map((p) => p.cargaKg)).toEqual([40, 60]);
    expect(relatorio.curva.cargaMaximaKg).toBe(60);
  });

  test("o ponto usa o nome do exercicio vindo do catalogo", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(relatorio.curva.pontos.map((p) => p.testeNome)).toEqual([
      "Squat Jump",
      "Agachamento",
    ]);
  });

  test("exercicio nao medido fica fora da curva em vez de virar zero", () => {
    const relatorio = montarRelatorio(
      avaliacao({
        velocidades: [
          { codigo: "SQUAT_JUMP", cargaKg: 40, tempoSegundos: 9.8 },
          { codigo: "AGACHAMENTO", cargaKg: null, tempoSegundos: null },
        ],
      }),
      HISTORICO,
    );

    expect(relatorio.curva.pontos).toHaveLength(1);
    expect(relatorio.curva.pontos[0].cargaKg).toBe(40);
  });

  test("um unico exercicio medido deixa o relatorio sem curva", () => {
    const relatorio = montarRelatorio(
      avaliacao({
        velocidades: [
          { codigo: "AGACHAMENTO", cargaKg: 60, tempoSegundos: 11.9 },
          { codigo: "SQUAT_JUMP", cargaKg: null, tempoSegundos: null },
        ],
      }),
      HISTORICO,
    );

    expect(relatorio.curva.ajuste).toBeNull();
    expect(relatorio.curva.perfil).toBe("Dados insuficientes");
    expect(relatorio.score).toEqual({ valor: 0, nivel: "Sem dados" });
    expect(relatorio.curva.suficiencia).toMatchObject({
      pontos: 1,
      temAjuste: false,
      r2Informativo: false,
    });
  });

  test("avaliacao sem nenhuma velocidade tambem fica sem curva", () => {
    const relatorio = montarRelatorio(avaliacao({ velocidades: [] }), HISTORICO);

    expect(relatorio.curva.pontos).toEqual([]);
    expect(relatorio.curva.cargaMaximaKg).toBeNull();
    expect(relatorio.curva.ajuste).toBeNull();
    expect(relatorio.curva.suficiencia.pontos).toBe(0);
  });

  /**
   * O caso que o modelo v2 torna a norma, e a razao de `suficiencia` existir.
   * Com 2 pontos a reta passa exatamente por ambos: `r2` da 1 sempre. Isso NAO
   * e ajuste perfeito, e ausencia de graus de liberdade — exibir como "indice de
   * qualidade" seria apresentar constante como informacao.
   */
  test("com dois pontos ha ajuste, mas r2 nao carrega informacao", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(relatorio.curva.ajuste).not.toBeNull();
    expect(relatorio.curva.ajuste!.r2).toBe(1);
    expect(relatorio.curva.suficiencia).toMatchObject({
      pontos: 2,
      temAjuste: true,
      r2Informativo: false,
    });
  });
});

describe("blocos de medida na resposta", () => {
  test("amplitude e saltos saem separados, como na entrada", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(relatorio.amplitude).toEqual(AMPLITUDE_VAZIA);
    expect(relatorio.saltos).toEqual(SALTOS);
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
