import { describe, expect, it } from "vitest";

import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { formatarNumeroOuTraco } from "@/features/shared/formato";
import { linhasDoBloco } from "./detalhe";

/**
 * Mistura deliberada de `null` (nao medido) e `0` (medido, deu zero) nos dois
 * blocos — e a distincao que a etapa existe pra preservar (planilha-atual.md
 * §139-141).
 */
const AVALIACAO: AvaliacaoCompleta = {
  id: "avaliacao-1",
  alunoId: "aluno-1",
  alunoNome: "Ana Prado",
  dataAvaliacao: "2026-08-02",
  criadoEm: "2026-08-02T10:00:00.000Z",
  observacoes: null,
  amplitude: {
    tornozelo: { direito: 11.5, esquerdo: 0 },
    quadril: { direito: null, esquerdo: 18.4 },
    isquiotibiais: { direito: null, esquerdo: null },
    slb: { direito: null, esquerdo: null },
  },
  saltos: { cmj: 42.8, salto2: 0, salto3: null, salto4: null, salto5: null },
  velocidade: {
    squatJump: { cargaKg: 20, tempoSegundos: 1.43 },
    agachamento: { cargaKg: null, tempoSegundos: null },
  },
};

describe("linhasDoBloco", () => {
  it("amplitude: 8 linhas, na ordem do catalogo, lado alternando", () => {
    const linhas = linhasDoBloco(AVALIACAO, "amplitude");
    expect(linhas).toHaveLength(8);
    expect(linhas.map((l) => `${l.chave}.${l.lado}`)).toEqual([
      "tornozelo.direito",
      "tornozelo.esquerdo",
      "quadril.direito",
      "quadril.esquerdo",
      "isquiotibiais.direito",
      "isquiotibiais.esquerdo",
      "slb.direito",
      "slb.esquerdo",
    ]);
  });

  it("salto: 5 linhas, lado sempre null", () => {
    const linhas = linhasDoBloco(AVALIACAO, "salto");
    expect(linhas).toHaveLength(5);
    expect(linhas.every((l) => l.lado === null)).toBe(true);
    expect(linhas.map((l) => l.chave)).toEqual([
      "cmj",
      "salto2",
      "salto3",
      "salto4",
      "salto5",
    ]);
  });

  it("preserva null como nao medido, nunca vira zero", () => {
    const linhas = linhasDoBloco(AVALIACAO, "amplitude");
    const quadrilDireito = linhas.find(
      (l) => l.chave === "quadril" && l.lado === "direito",
    );
    expect(quadrilDireito?.valor).toBeNull();
  });

  it("preserva zero legitimo, nunca vira null", () => {
    const amplitude = linhasDoBloco(AVALIACAO, "amplitude");
    const tornozeloEsquerdo = amplitude.find(
      (l) => l.chave === "tornozelo" && l.lado === "esquerdo",
    );
    expect(tornozeloEsquerdo?.valor).toBe(0);

    const salto = linhasDoBloco(AVALIACAO, "salto");
    const salto2 = salto.find((l) => l.chave === "salto2");
    expect(salto2?.valor).toBe(0);
  });

  it("associa a chave do DTO ao rotulo certo do catalogo", () => {
    const linhas = linhasDoBloco(AVALIACAO, "amplitude");
    const slbEsquerdo = linhas.find(
      (l) => l.chave === "slb" && l.lado === "esquerdo",
    );
    expect(slbEsquerdo?.rotulo).toBe("SLB ESQ");
  });

  it("unidade vem do catalogo para as medidas confirmadas", () => {
    const linhas = [
      ...linhasDoBloco(AVALIACAO, "amplitude"),
      ...linhasDoBloco(AVALIACAO, "salto").filter((l) => l.chave === "cmj"),
    ];
    expect(linhas.every((l) => l.unidade === "cm")).toBe(true);
  });

  it("unidade null para os quatro saltos provisorios (bloqueio B6)", () => {
    const linhas = linhasDoBloco(AVALIACAO, "salto").filter(
      (l) => l.chave !== "cmj",
    );
    expect(linhas).toHaveLength(4);
    expect(linhas.every((l) => l.unidade === null)).toBe(true);
  });

  it("formatarNumeroOuTraco distingue null de zero", () => {
    expect(formatarNumeroOuTraco(0)).toBe("0");
    expect(formatarNumeroOuTraco(null)).toBe("—");
  });
});
