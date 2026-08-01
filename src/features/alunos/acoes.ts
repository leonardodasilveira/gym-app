"use client";

import { atualizarAlunoSchema, criarAlunoSchema } from "@/lib/schemas";

import type { CampoAluno, EstadoAluno } from "@/features/alunos/tipos";
import {
  formDataParaAluno,
  formDataParaValores,
  issuesParaErros,
  zodErrorParaIssues,
} from "@/features/alunos/mappers";
import { apiFetch, type ResultadoApi } from "@/features/shared/api";
import { mensagemDoErro } from "@/features/shared/erros";

const MENSAGEM_LIMPAR_DATA =
  "Não é possível remover a data de nascimento nesta versão. Corrija a data ou mantenha a atual.";

/**
 * Validacao no cliente (Zod) -> requisicao -> EstadoAluno. Compartilhado por
 * criarAluno e atualizarAluno: so muda metodo, caminho e schema.
 */
async function enviarAluno(
  metodo: "POST" | "PATCH",
  caminho: string,
  schema: typeof criarAlunoSchema | typeof atualizarAlunoSchema,
  estadoAnterior: EstadoAluno,
  formData: FormData,
): Promise<EstadoAluno> {
  const valores = formDataParaValores(formData);
  const tentativaAnterior = estadoAnterior.status === "erro" ? estadoAnterior.tentativa : 0;

  const erro = (
    mensagem: string | null,
    errosPorCampo: Partial<Record<CampoAluno, string>>,
  ): EstadoAluno => ({
    status: "erro",
    mensagem,
    errosPorCampo,
    valores,
    tentativa: tentativaAnterior + 1,
  });

  const bruto = formDataParaAluno(formData);
  const resultado = schema.safeParse(bruto);

  if (!resultado.success) {
    const { errosPorCampo, mensagemGeral } = issuesParaErros(
      zodErrorParaIssues(resultado.error),
    );
    return erro(mensagemGeral, errosPorCampo);
  }

  const resposta = await apiFetch<{ id: string }>(caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resultado.data),
  });

  if (!resposta.ok) {
    if (resposta.erro.status === 422 && resposta.erro.issues) {
      const { errosPorCampo, mensagemGeral } = issuesParaErros(resposta.erro.issues);
      return erro(mensagemGeral, errosPorCampo);
    }
    return erro(mensagemDoErro(resposta.erro.status), {});
  }

  return { status: "sucesso", id: resposta.dados.id };
}

/** Acao do useActionState em /alunos/novo. */
export async function criarAluno(
  estadoAnterior: EstadoAluno,
  formData: FormData,
): Promise<EstadoAluno> {
  return enviarAluno("POST", "/api/alunos", criarAlunoSchema, estadoAnterior, formData);
}

/**
 * Acao do useActionState em /alunos/:id/editar. `aluno.dataNascimento` vem
 * do valor carregado no servidor — usado so pra decidir a guarda abaixo,
 * nunca reenviado como veio.
 *
 * Guarda de dataNascimento (spec 4.4/8.4): PATCH nao aceita null nem ""
 * pra limpar o campo (ambos dao 422), e omitir a chave mantem o valor
 * antigo — nao ha payload que limpe a data. Bloquear no cliente ANTES do
 * fetch evita a resposta enganosa "salvo com sucesso" com a data intacta.
 */
export async function atualizarAluno(
  aluno: { id: string; dataNascimento: string | null },
  estadoAnterior: EstadoAluno,
  formData: FormData,
): Promise<EstadoAluno> {
  const valores = formDataParaValores(formData);

  if (aluno.dataNascimento !== null && valores.dataNascimento.trim() === "") {
    const tentativaAnterior = estadoAnterior.status === "erro" ? estadoAnterior.tentativa : 0;
    return {
      status: "erro",
      mensagem: null,
      errosPorCampo: { dataNascimento: MENSAGEM_LIMPAR_DATA },
      valores,
      tentativa: tentativaAnterior + 1,
    };
  }

  return enviarAluno(
    "PATCH",
    `/api/alunos/${encodeURIComponent(aluno.id)}`,
    atualizarAlunoSchema,
    estadoAnterior,
    formData,
  );
}

/** Inativar/reativar — PATCH direto, sem formulario. */
export async function alternarAtivo(
  id: string,
  ativo: boolean,
): Promise<ResultadoApi<{ id: string; ativo: boolean }>> {
  return apiFetch(`/api/alunos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativo }),
  });
}

/** Exclusao — DELETE responde 204 sem corpo; apiFetch ja trata isso. */
export async function excluirAluno(id: string): Promise<ResultadoApi<undefined>> {
  return apiFetch(`/api/alunos/${encodeURIComponent(id)}`, { method: "DELETE" });
}
