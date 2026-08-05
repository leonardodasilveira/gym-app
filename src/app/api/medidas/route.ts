import { handler, json } from "@/lib/http";
import {
  EXERCICIOS_VELOCIDADE,
  MEDIDAS,
  SUFIXO_LADO,
  siglaComLado,
} from "@/lib/medidas";

/**
 * Catalogo da avaliacao: o front monta formulario e rotulos a partir daqui, em
 * vez de chumbar "Mobilidade de tornozelo" e "SLB ESQ" no codigo dele.
 *
 * Estatico — nao consulta o banco.
 *
 * No v2 a resposta ganhou duas coisas que o formulario de tres blocos precisa:
 * `bloco` em cada medida (amplitude ou salto) e a lista `velocidade`, que nao
 * sai de `MEDIDAS` porque exercicio de velocidade tem duas grandezas e nao cabe
 * na mesma forma.
 *
 * `unidade` pode vir `null` — sao os quatro saltos cuja unidade o cliente ainda
 * nao confirmou (bloqueio B6). Quem renderiza deve imprimir o valor sem sufixo
 * nesse caso, nunca assumir "cm".
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
      bloco: medida.bloco,
      siglas: medida.bilateral
        ? {
            direito: siglaComLado(medida.sigla, "direito"),
            esquerdo: siglaComLado(medida.sigla, "esquerdo"),
          }
        : { valor: medida.sigla },
    })),
    velocidade: EXERCICIOS_VELOCIDADE.map((exercicio) => ({
      chave: exercicio.chave,
      codigo: exercicio.codigo,
      nome: exercicio.nome,
      // Fixas pelo dominio e nao transportadas no payload — estao aqui so pra
      // o front rotular os campos.
      unidades: { carga: "kg", tempo: "s" },
    })),
  }),
);
