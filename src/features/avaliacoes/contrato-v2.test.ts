import { describe, expect, it } from "vitest";
import { avaliacaoV2Completa, avaliacaoV2Parcial } from "./__fixtures__/avaliacaoV2";
import { schemaAvaliacaoV2Provisorio } from "./contrato-v2";

describe("schemaAvaliacaoV2Provisorio", () => {
  it.each([avaliacaoV2Completa, avaliacaoV2Parcial])("aceita fixtures válidas", (fixture) => expect(schemaAvaliacaoV2Provisorio.safeParse(fixture).success).toBe(true));
  it.each([
    [{ ...avaliacaoV2Parcial, velocidade: { ...avaliacaoV2Parcial.velocidade, squatJump: { cargaKg: 20, tempoSegundos: null } } }, "velocidade.squatJump.tempoSegundos", "Informe o tempo junto com a carga."],
    [{ ...avaliacaoV2Parcial, velocidade: { ...avaliacaoV2Parcial.velocidade, squatJump: { cargaKg: null, tempoSegundos: 1.2 } } }, "velocidade.squatJump.cargaKg", "Informe a carga junto com o tempo."],
  ])("aponta o campo faltante", (fixture, path, mensagem) => {
    const resultado = schemaAvaliacaoV2Provisorio.safeParse(fixture); expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues).toContainEqual(expect.objectContaining({ path: String(path).split("."), message: mensagem }));
  });
  it("rejeita tempo zero", () => { const fixture = { ...avaliacaoV2Parcial, velocidade: { ...avaliacaoV2Parcial.velocidade, squatJump: { cargaKg: 0, tempoSegundos: 0 } } }; expect(schemaAvaliacaoV2Provisorio.safeParse(fixture).success).toBe(false); });
});
