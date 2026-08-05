import { describe, expect, it } from "vitest";
import { paraNumero } from "./decimal";

describe("paraNumero", () => {
  it.each([["", null], ["  ", null], ["11,5", 11.5], ["11.5", 11.5], ["0", 0], ["-1", -1]])("converte %s", (entrada, valor) => expect(paraNumero(entrada)).toEqual({ ok: true, valor }));
  it.each(["1.000,5", "1e3", "+1", "1,2,3", "abc"])("rejeita %s", (entrada) => expect(paraNumero(entrada)).toEqual({ ok: false }));
});
