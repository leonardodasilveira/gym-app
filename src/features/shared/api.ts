import { mensagemDoErro } from "@/features/shared/erros";

export type ProblemaApi = {
  status: number;
  mensagem: string;
  issues?: { field: string; message: string }[];
};

export type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: ProblemaApi };

/**
 * Unico ponto de chamada HTTP do front. Seguro para Server e Client
 * Components: nao importa nada de `next/headers`. Quem chama no servidor
 * passa o caminho ja absoluto; no cliente, um caminho relativo basta.
 */
export async function apiFetch<T>(
  caminho: string,
  init?: RequestInit,
): Promise<ResultadoApi<T>> {
  let resposta: Response;

  try {
    resposta = await fetch(caminho, init);
  } catch {
    return { ok: false, erro: { status: 0, mensagem: mensagemDoErro(0) } };
  }

  // DELETE responde 204 sem corpo — nunca chamar res.json() aqui.
  if (resposta.status === 204) {
    return { ok: true, dados: undefined as T };
  }

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as {
      issues?: { field: string; message: string }[];
    } | null;

    return {
      ok: false,
      erro: {
        status: resposta.status,
        mensagem: mensagemDoErro(resposta.status),
        issues: corpo?.issues,
      },
    };
  }

  const dados = (await resposta.json()) as T;
  return { ok: true, dados };
}
