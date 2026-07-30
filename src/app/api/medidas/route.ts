import { handler, json } from "@/lib/http";
import { MEDIDAS, SUFIXO_LADO, siglaComLado } from "@/lib/medidas";

/**
 * Catalogo de medidas: o front monta formulario e rotulos a partir daqui, em
 * vez de chumbar "Mobilidade de tornozelo" e "SLB ESQ" no codigo dele.
 *
 * Estatico — nao consulta o banco.
 */
export const GET = handler(async () =>
  json({
    sufixoLado: SUFIXO_LADO,
    medidas: MEDIDAS.map((medida) => ({
      chave: medida.chave,
      codigo: medida.codigo,
      sigla: medida.sigla,
      nome: medida.nome,
      unidade: medida.unidade,
      bilateral: medida.bilateral,
      siglas: medida.bilateral
        ? {
            direito: siglaComLado(medida.sigla, "direito"),
            esquerdo: siglaComLado(medida.sigla, "esquerdo"),
          }
        : { valor: medida.sigla },
    })),
  }),
);
