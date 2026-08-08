import { describe, expect, it } from "vitest";

import {
  hrefComPeriodo,
  periodoDosParametros,
} from "@/features/relatorio/periodo";

describe("periodoDosParametros", () => {
  const padrao = { semanas: 8, valorUrl: "8" };

  it("usa oito semanas quando o parametro esta ausente", () => {
    expect(periodoDosParametros(undefined)).toEqual(padrao);
  });

  it.each(["8", "12", "26", "52"])(
    "aceita a opcao conhecida %s",
    (valor) => {
      expect(periodoDosParametros(valor)).toEqual({
        semanas: Number(valor),
        valorUrl: valor,
      });
    },
  );

  it("traduz todo para historico completo", () => {
    expect(periodoDosParametros("todo")).toEqual({
      semanas: null,
      valorUrl: "todo",
    });
  });

  it.each(["0", "999", "abc", ""])(
    "normaliza a entrada invalida %j",
    (valor) => {
      expect(() => periodoDosParametros(valor)).not.toThrow();
      expect(periodoDosParametros(valor)).toEqual(padrao);
    },
  );

  it("normaliza um numero aceito pelo backend mas ausente da interface", () => {
    expect(periodoDosParametros("7")).toEqual(padrao);
  });

  it("normaliza parametros repetidos", () => {
    expect(periodoDosParametros(["8", "12"])).toEqual(padrao);
  });
});

describe("hrefComPeriodo", () => {
  const base = "/avaliacoes/avaliacao-1/relatorio";

  it("preserva o caminho e acrescenta um periodo explicito", () => {
    expect(hrefComPeriodo(base, "12")).toBe(`${base}?semanas=12`);
  });

  it("gera a forma canonica estavel e idempotente para o padrao", () => {
    expect(hrefComPeriodo(`${base}?semanas=26`, "8")).toBe(base);
    expect(hrefComPeriodo(hrefComPeriodo(base, "8"), "8")).toBe(base);
  });
});
