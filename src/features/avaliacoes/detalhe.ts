import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { colunasDeMedida, valorDaColuna } from "@/features/alunos/utils";

export type LinhaMedidaDetalhe = {
  chave: string;
  lado: "direito" | "esquerdo" | null;
  rotulo: string;
  nomeCompleto: string;
  /** null = unidade ainda nao confirmada (bloqueio B6). */
  unidade: string | null;
  valor: number | null;
};

/**
 * Linhas de um bloco (Amplitude ou Salto), na ordem do catalogo. Toda chave
 * sempre presente — ausencia de dado e ausencia de linha sao coisas
 * diferentes, e a segunda esconderia do professor o que nao foi medido.
 *
 * Nao redariva o catalogo: reusa colunasDeMedida()/valorDaColuna()
 * (features/alunos/utils.ts), que ja fazem a associacao entre a chave do DTO
 * e sigla/nome/unidade/bloco. Uma fonte de verdade so.
 */
export function linhasDoBloco(
  avaliacao: AvaliacaoCompleta,
  bloco: "amplitude" | "salto",
): LinhaMedidaDetalhe[] {
  return colunasDeMedida()
    .filter((coluna) => coluna.bloco === bloco)
    .map((coluna) => ({
      chave: coluna.chave,
      lado: coluna.lado,
      rotulo: coluna.rotulo,
      nomeCompleto: coluna.nomeCompleto,
      unidade: coluna.unidade,
      valor: valorDaColuna(avaliacao, coluna),
    }));
}
