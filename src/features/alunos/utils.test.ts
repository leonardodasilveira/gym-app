import { describe, expect, test } from "vitest";

import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import {
  colunasDeMedida,
  montarLinhasComparacao,
  valorDaColuna,
} from "@/features/alunos/utils";

/**
 * Cobre exatamente o que quebrou quando o backend passou pro contrato v2:
 * `valorDaColuna` lia `avaliacao.medidas[chave]`, campo que deixou de existir,
 * e nenhum teste percebeu. O typecheck acusou; o runtime tambem — mas so depois
 * do merge. Estes casos falham antes disso.
 */

const avaliacao = (parcial: Partial<AvaliacaoCompleta> = {}) =>
  ({
    id: "aval-1",
    alunoId: "aluno-1",
    alunoNome: "Carla Menezes",
    dataAvaliacao: "2026-04-30",
    amplitude: {
      tornozelo: { direito: 12.4, esquerdo: 13.1 },
      quadril: { direito: 19.9, esquerdo: 19.2 },
      isquiotibiais: { direito: 22.7, esquerdo: 22.4 },
      slb: { direito: 35.1, esquerdo: 34.5 },
    },
    saltos: { cmj: 43.53, salto2: 38.74, salto3: null, salto4: null, salto5: null },
    velocidade: {
      squatJump: { cargaKg: 20, tempoSegundos: 1.32 },
      agachamento: { cargaKg: 60, tempoSegundos: 1.77 },
    },
    observacoes: null,
    criadoEm: "2026-08-05T17:03:31.965Z",
    ...parcial,
  }) satisfies AvaliacaoCompleta;

describe("colunasDeMedida", () => {
  test("uma coluna por lado nas bilaterais e uma nas simples", () => {
    const colunas = colunasDeMedida();

    // 4 amplitudes x 2 lados + CMJ + 4 saltos provisorios.
    expect(colunas).toHaveLength(13);
    expect(colunas.filter((c) => c.bloco === "amplitude")).toHaveLength(8);
    expect(colunas.filter((c) => c.bloco === "salto")).toHaveLength(5);
  });

  test("so os quatro saltos provisorios ficam sem unidade (B6)", () => {
    const semUnidade = colunasDeMedida().filter((c) => c.unidade === null);

    expect(semUnidade.map((c) => c.chave)).toEqual([
      "salto2",
      "salto3",
      "salto4",
      "salto5",
    ]);
  });

  test("segue a ordem do catalogo, com o lado no rotulo", () => {
    expect(colunasDeMedida().slice(0, 3).map((c) => c.rotulo)).toEqual([
      "TOR DIR",
      "TOR ESQ",
      "QUA DIR",
    ]);
  });
});

describe("valorDaColuna", () => {
  const colunas = colunasDeMedida();
  const porRotulo = (rotulo: string) =>
    colunas.find((coluna) => coluna.rotulo === rotulo)!;

  test("bilateral sai do bloco amplitude, no lado certo", () => {
    expect(valorDaColuna(avaliacao(), porRotulo("TOR DIR"))).toBe(12.4);
    expect(valorDaColuna(avaliacao(), porRotulo("TOR ESQ"))).toBe(13.1);
  });

  test("valor unico sai do bloco saltos", () => {
    expect(valorDaColuna(avaliacao(), porRotulo("CMJ"))).toBe(43.53);
    expect(valorDaColuna(avaliacao(), porRotulo("SALTO 2"))).toBe(38.74);
  });

  test("nao medido e null, nao zero", () => {
    expect(valorDaColuna(avaliacao(), porRotulo("SALTO 3"))).toBeNull();
  });
});

describe("montarLinhasComparacao", () => {
  test("todas as linhas saem, mesmo sem valor nos dois lados", () => {
    const linhas = montarLinhasComparacao(avaliacao(), avaliacao());

    expect(linhas).toHaveLength(13);
  });

  test("delta so existe quando os dois valores sao numeros", () => {
    const anterior = avaliacao({
      saltos: { cmj: 40, salto2: null, salto3: null, salto4: null, salto5: null },
    });
    const linhas = montarLinhasComparacao(avaliacao(), anterior);

    const cmj = linhas.find((linha) => linha.rotulo === "CMJ")!;
    expect(cmj).toMatchObject({ anterior: 40, atual: 43.53, delta: 3.53 });

    // `salto2` tem valor so na atual — sem par, sem delta (e nao zero).
    const salto2 = linhas.find((linha) => linha.rotulo === "SALTO 2")!;
    expect(salto2).toMatchObject({ anterior: null, atual: 38.74, delta: null });
  });
});
