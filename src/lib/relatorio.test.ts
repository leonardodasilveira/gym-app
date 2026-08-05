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
 * A curva forca-velocidade, o ajuste, o perfil e o score sairam do relatorio em
 * 05/08/2026. Motivo: o modelo v2 reduziu a curva de 8 pontos para no maximo 2,
 * e com 2 pontos a reta e exata por construcao — `r2` da 1 sempre, e perfil e
 * score viram funcao de duas medicoes.
 *
 * O relatorio passa a publicar o dado **medido** (carga e tempo), sem nenhuma
 * derivacao. Estes testes existem pra que reintroduzir qualquer numero derivado
 * seja decisao explicita, e nao volta silenciosa.
 */
describe("velocidade no relatorio: dado medido, sem derivacao", () => {
  test("publica carga e tempo como o professor digitou", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(relatorio.velocidade).toEqual({
      squatJump: { cargaKg: 40, tempoSegundos: 9.8 },
      agachamento: { cargaKg: 60, tempoSegundos: 11.9 },
    });
  });

  test("a versao detalhada traz o nome do exercicio pronto pra imprimir", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(relatorio.velocidadeDetalhada).toEqual([
      { codigo: "SQUAT_JUMP", nome: "Squat Jump", cargaKg: 40, tempoSegundos: 9.8 },
      { codigo: "AGACHAMENTO", nome: "Agachamento", cargaKg: 60, tempoSegundos: 11.9 },
    ]);
  });

  test("exercicio nao medido aparece com null, nao some nem vira zero", () => {
    const relatorio = montarRelatorio(
      avaliacao({
        velocidades: [
          { codigo: "SQUAT_JUMP", cargaKg: 40, tempoSegundos: 9.8 },
          { codigo: "AGACHAMENTO", cargaKg: null, tempoSegundos: null },
        ],
      }),
      HISTORICO,
    );

    expect(relatorio.velocidadeDetalhada).toHaveLength(2);
    expect(relatorio.velocidadeDetalhada[1]).toMatchObject({
      nome: "Agachamento",
      cargaKg: null,
      tempoSegundos: null,
    });
  });

  test("avaliacao sem nenhuma velocidade gravada nao quebra o relatorio", () => {
    const relatorio = montarRelatorio(avaliacao({ velocidades: [] }), HISTORICO);

    expect(relatorio.velocidadeDetalhada).toHaveLength(2);
    expect(relatorio.velocidade.squatJump).toEqual({
      cargaKg: null,
      tempoSegundos: null,
    });
  });

  test("nenhum numero derivado sobrou na resposta", () => {
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);
    const chaves = Object.keys(relatorio);

    for (const removida of ["curva", "score"]) {
      expect(chaves).not.toContain(removida);
    }
    // Nem escondido dentro de outro bloco.
    const json = JSON.stringify(relatorio);
    expect(json).not.toContain("velocidadeMs");
    expect(json).not.toContain("perfil");
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
    //
    // `curva` e `score` sairam da lista junto com as secoes que descreviam:
    // sobrou so o texto lorem ipsum.
    const relatorio = montarRelatorio(avaliacao(), HISTORICO);

    expect(Object.keys(relatorio.provisorio)).toEqual(["textos"]);
  });
});
