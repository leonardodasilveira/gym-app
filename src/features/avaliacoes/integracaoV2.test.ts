import { afterEach, describe, expect, it, vi } from "vitest";
import { avaliacaoV2Completa } from "./__fixtures__/avaliacaoV2";
import { enviarAvaliacaoV2 } from "./integracaoV2";
import { mensagemDoErro } from "@/features/shared/erros";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("enviarAvaliacaoV2", () => {
  it("envia POST /api/avaliacoes com o DTO e devolve o id no 201", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "abc-123" }), { status: 201 }));

    const resultado = await enviarAvaliacaoV2(avaliacaoV2Completa);

    expect(resultado).toEqual({ ok: true, id: "abc-123" });
    expect(fetchSpy).toHaveBeenCalledWith("/api/avaliacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(avaliacaoV2Completa),
    });
  });

  it("mapeia 422 preservando os issues[].field literais", async () => {
    const issues = [
      {
        field: "velocidade.squatJump.tempoSegundos",
        message: "Informe o tempo junto com a carga.",
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Dados invalidos", issues }), { status: 422 }),
    );

    const resultado = await enviarAvaliacaoV2(avaliacaoV2Completa);

    expect(resultado).toEqual({ ok: false, status: 422, mensagem: mensagemDoErro(422), issues });
  });

  it("mapeia 404 (aluno inexistente) sem issues", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Aluno nao encontrado" }), { status: 404 }),
    );

    const resultado = await enviarAvaliacaoV2(avaliacaoV2Completa);

    expect(resultado).toEqual({ ok: false, status: 404, mensagem: mensagemDoErro(404) });
  });

  it("mapeia 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 }),
    );

    const resultado = await enviarAvaliacaoV2(avaliacaoV2Completa);

    expect(resultado).toEqual({ ok: false, status: 500, mensagem: mensagemDoErro(500) });
  });

  it("mapeia falha de rede para status 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    const resultado = await enviarAvaliacaoV2(avaliacaoV2Completa);

    expect(resultado).toEqual({ ok: false, status: 0, mensagem: mensagemDoErro(0) });
  });
});
