import { cache } from "react";

import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { apiFetch, type ResultadoApi } from "@/features/shared/api";
import { origemAtual } from "@/features/shared/origem";

/**
 * Dedupe via cache() do React (frontend-plan.md 5.4): `generateMetadata` e a
 * pagina chamam esta funcao para o mesmo id na mesma renderizacao, e o
 * fetch roda uma unica vez. Server-only — usa origemAtual(), que le
 * headers(); nunca importar em Client Component.
 */
export const carregarAvaliacao = cache(
  async (id: string): Promise<ResultadoApi<AvaliacaoCompleta>> => {
    const origem = await origemAtual();
    const idCodificado = encodeURIComponent(id);
    return apiFetch<AvaliacaoCompleta>(
      `${origem}/api/avaliacoes/${idCodificado}`,
    );
  },
);
