import { describe, expect, it, vi } from "vitest";
import { avaliacaoV2Completa } from "./__fixtures__/avaliacaoV2";
import { enviarAvaliacaoV2 } from "./integracaoV2";

describe("enviarAvaliacaoV2", () => {
  it("indica indisponibilidade sem chamar fetch", async () => { const fetchSpy = vi.spyOn(globalThis, "fetch"); expect(await enviarAvaliacaoV2(avaliacaoV2Completa)).toEqual({ ok: false, motivo: "backend-v2-indisponivel" }); expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore(); });
});
