import type { CriarAvaliacaoDTO } from "@/lib/schemas";

export type ResultadoIntegracaoV2 = { ok: true; id: string } | { ok: false; motivo: "backend-v2-indisponivel" } | { ok: false; motivo: "erro-api"; status: number; mensagem: string; issues?: { field: string; message: string }[] };

/** Única porta de submissão. Enquanto o backend for v1, não realiza HTTP. */
export async function enviarAvaliacaoV2(_dto: CriarAvaliacaoDTO): Promise<ResultadoIntegracaoV2> {
  void _dto;
  return { ok: false, motivo: "backend-v2-indisponivel" };
}
