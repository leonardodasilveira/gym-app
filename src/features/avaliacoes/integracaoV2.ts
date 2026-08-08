import type { CriarAvaliacaoDTO } from "@/lib/schemas";
import { apiFetch } from "@/features/shared/api";

export type ResultadoIntegracaoV2 =
  | { ok: true; id: string }
  | { ok: false; status: number; mensagem: string; issues?: { field: string; message: string }[] };

/** Única porta de submissão. Chama POST /api/avaliacoes — o backend v2 já existe. */
export async function enviarAvaliacaoV2(dto: CriarAvaliacaoDTO): Promise<ResultadoIntegracaoV2> {
  const resposta = await apiFetch<{ id: string }>("/api/avaliacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (resposta.ok) return { ok: true, id: resposta.dados.id };

  return {
    ok: false,
    status: resposta.erro.status,
    mensagem: resposta.erro.mensagem,
    issues: resposta.erro.issues,
  };
}
