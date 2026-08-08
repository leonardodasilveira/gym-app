"use client";

import { criarAvaliacaoSchema } from "@/lib/schemas";
import { apiFetch, type ResultadoApi } from "@/features/shared/api";
import { enviarAvaliacaoV2 } from "./integracaoV2";
import { formDataParaDTO, formDataParaValoresV2, issuesParaErros, zodErrorParaIssues } from "./mappers";
import type { EstadoAvaliacaoV2 } from "./tipos";

export async function criarAvaliacaoV2(contexto: { alunoId: string }, estadoAnterior: EstadoAvaliacaoV2, formData: FormData): Promise<EstadoAvaliacaoV2> {
  const valores = formDataParaValoresV2(formData);
  const tentativaAnterior = estadoAnterior.status === "erro" ? estadoAnterior.tentativa : 0;
  const erro = (mensagem: string | null, errosPorCampo: Record<string, string>): EstadoAvaliacaoV2 => ({ status: "erro", mensagem, errosPorCampo, valores, tentativa: tentativaAnterior + 1 });
  const { dto, errosLexicais } = formDataParaDTO(formData, contexto.alunoId);
  if (Object.keys(errosLexicais).length) return erro(null, errosLexicais);
  const resultado = criarAvaliacaoSchema.safeParse(dto);
  if (!resultado.success) { const mapeados = issuesParaErros(zodErrorParaIssues(resultado.error)); return erro(mapeados.mensagemGeral, mapeados.errosPorCampo); }
  const resposta = await enviarAvaliacaoV2(resultado.data);
  if (resposta.ok) return { status: "sucesso", id: resposta.id };
  if (resposta.status === 422 && resposta.issues) { const mapeados = issuesParaErros(resposta.issues); return erro(mapeados.mensagemGeral, mapeados.errosPorCampo); }
  return erro(resposta.mensagem, {});
}

/** Exclusao — DELETE direto, sem formulario. */
export async function excluirAvaliacao(id: string): Promise<ResultadoApi<undefined>> {
  return apiFetch(`/api/avaliacoes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
