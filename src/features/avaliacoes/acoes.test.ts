import { describe, expect, it, vi } from "vitest";

import { MENSAGEM_BACKEND_INDISPONIVEL, criarAvaliacaoV2 } from "./acoes";

const ALUNO_ID = "8b4dfdff-ba28-4085-a11d-43062d642925";

function formularioValido(): FormData {
  const fd = new FormData();
  fd.set("dataAvaliacao", "2026-08-05");
  fd.set("observacoes", "  preenchimento preservado  ");
  fd.set("saltos.cmj", "11,5");
  return fd;
}

describe("criarAvaliacaoV2", () => {
  it("valida sem rede e preserva os valores no estado pendente", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      formularioValido(),
    );

    expect(estado).toEqual({
      status: "pendente-integracao",
      mensagem: MENSAGEM_BACKEND_INDISPONIVEL,
      valores: expect.objectContaining({
        dataAvaliacao: "2026-08-05",
        observacoes: "  preenchimento preservado  ",
        campos: expect.objectContaining({ "saltos.cmj": "11,5" }),
      }),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("mantém todos os erros lexicais e os valores digitados", async () => {
    const fd = formularioValido();
    fd.set("saltos.cmj", "1e3");
    fd.set("saltos.salto2", "+1");
    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      fd,
    );

    expect(estado.status).toBe("erro");
    if (estado.status === "erro") {
      expect(Object.keys(estado.errosPorCampo)).toEqual(["saltos.cmj", "saltos.salto2"]);
      expect(estado.valores.campos["saltos.cmj"]).toBe("1e3");
    }
  });

  it.each([
    ["velocidade.squatJump.cargaKg", "20", "velocidade.squatJump.tempoSegundos"],
    ["velocidade.squatJump.tempoSegundos", "1,2", "velocidade.squatJump.cargaKg"],
  ])("aponta o campo complementar ausente", async (preenchido, valor, faltante) => {
    const fd = formularioValido();
    fd.set(preenchido, valor);
    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      fd,
    );

    expect(estado.status).toBe("erro");
    if (estado.status === "erro") expect(estado.errosPorCampo).toHaveProperty(faltante);
  });
});
