import { afterEach, describe, expect, it, vi } from "vitest";

import { criarAvaliacaoV2, excluirAvaliacao } from "./acoes";
import { mensagemDoErro } from "@/features/shared/erros";

const ALUNO_ID = "8b4dfdff-ba28-4085-a11d-43062d642925";

function formularioValido(): FormData {
  const fd = new FormData();
  fd.set("dataAvaliacao", "2026-08-05");
  fd.set("observacoes", "  preenchimento preservado  ");
  fd.set("saltos.cmj", "11,5");
  return fd;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("criarAvaliacaoV2", () => {
  it("envia o DTO validado e devolve sucesso no 201", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "avaliacao-1" }), { status: 201 }));

    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      formularioValido(),
    );

    expect(estado).toEqual({ status: "sucesso", id: "avaliacao-1" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [caminho, init] = fetchSpy.mock.calls[0];
    expect(caminho).toBe("/api/avaliacoes");
    expect(init?.method).toBe("POST");
    const corpoEnviado = JSON.parse(init?.body as string);
    expect(corpoEnviado).toMatchObject({
      alunoId: ALUNO_ID,
      dataAvaliacao: "2026-08-05",
      saltos: expect.objectContaining({ cmj: 11.5 }),
    });
  });

  it("mantém todos os erros lexicais e os valores digitados, sem chamar rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
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
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["velocidade.squatJump.cargaKg", "20", "velocidade.squatJump.tempoSegundos"],
    ["velocidade.squatJump.tempoSegundos", "1,2", "velocidade.squatJump.cargaKg"],
  ])("aponta o campo complementar ausente sem chamar rede", async (preenchido, valor, faltante) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fd = formularioValido();
    fd.set(preenchido, valor);
    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      fd,
    );

    expect(estado.status).toBe("erro");
    if (estado.status === "erro") expect(estado.errosPorCampo).toHaveProperty(faltante);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mapeia 422 do backend para erros por campo, com os paths literais", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Dados invalidos",
          issues: [{ field: "saltos.cmj", message: "Precisa ser maior ou igual a zero" }],
        }),
        { status: 422 },
      ),
    );

    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      formularioValido(),
    );

    expect(estado.status).toBe("erro");
    if (estado.status === "erro") {
      expect(estado.errosPorCampo).toEqual({ "saltos.cmj": "Precisa ser maior ou igual a zero" });
    }
  });

  it("mapeia 404 (aluno inexistente) como erro geral", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Aluno nao encontrado" }), { status: 404 }),
    );

    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      formularioValido(),
    );

    expect(estado).toMatchObject({ status: "erro", mensagem: mensagemDoErro(404) });
  });

  it("mapeia falha de rede como erro geral", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    const estado = await criarAvaliacaoV2(
      { alunoId: ALUNO_ID },
      { status: "inicial" },
      formularioValido(),
    );

    expect(estado).toMatchObject({ status: "erro", mensagem: mensagemDoErro(0) });
  });
});

describe("excluirAvaliacao", () => {
  const ID = "avaliacao-1";

  it("204 -> sucesso, chamando DELETE no id codificado", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const resultado = await excluirAvaliacao(ID);

    expect(resultado).toEqual({ ok: true, dados: undefined });
    expect(fetchSpy).toHaveBeenCalledWith(`/api/avaliacoes/${ID}`, {
      method: "DELETE",
    });
  });

  it("404 -> erro com status 404 (o chamador decide tratar como sucesso)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Avaliacao nao encontrada" }), {
        status: 404,
      }),
    );

    const resultado = await excluirAvaliacao(ID);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.status).toBe(404);
  });

  it("500 -> erro com status 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 }),
    );

    const resultado = await excluirAvaliacao(ID);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.status).toBe(500);
  });

  it("falha de rede -> erro com status 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    const resultado = await excluirAvaliacao(ID);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.status).toBe(0);
  });

  it("codifica o id no caminho da requisicao", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await excluirAvaliacao("id com espaço");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/avaliacoes/id%20com%20espa%C3%A7o",
      { method: "DELETE" },
    );
  });
});
