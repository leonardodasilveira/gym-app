import { headers } from "next/headers";

/**
 * Origem absoluta da requisicao atual (protocolo + host). Unico modulo do
 * front que importa `next/headers` — nunca importar em Client Component.
 * fetch em Server Component exige URL absoluta; isso tambem torna a rota
 * dinamica, evitando prerender contra um servidor fora do ar.
 */
export async function origemAtual(): Promise<string> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host");
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "http";
  return `${protocolo}://${host}`;
}
