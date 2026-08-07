import {
  MEDIDAS,
  siglaComLado,
  type ChaveAmplitude,
  type ChaveSalto,
  type Lado,
} from "@/lib/medidas";

import type {
  AlunoResumo,
  AvaliacaoCompleta,
  StatusFiltro,
} from "@/features/alunos/tipos";
import { arredondar } from "@/features/shared/formato";

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

/** Remove espacos nas extremidades, acentos e diferenca de maiusculas. */
export function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase();
}

/** Qualquer valor fora de "ativo"/"inativo" vira "todos", sem erro. */
export function paraStatusFiltro(valor: string | undefined): StatusFiltro {
  return valor === "ativo" || valor === "inativo" ? valor : "todos";
}

/** Pura: nao muta `alunos`. Busca por nome, insensivel a acento e caixa. */
export function filtrarAlunos(
  alunos: AlunoResumo[],
  busca: string,
  status: StatusFiltro,
): AlunoResumo[] {
  const buscaNormalizada = normalizarTexto(busca);

  return alunos.filter((aluno) => {
    if (status === "ativo" && !aluno.ativo) return false;
    if (status === "inativo" && aluno.ativo) return false;

    if (
      buscaNormalizada &&
      !normalizarTexto(aluno.nome).includes(buscaNormalizada)
    ) {
      return false;
    }

    return true;
  });
}

type ColunaMedidaBase = {
  rotulo: string;
  nomeCompleto: string;
  /**
   * null = unidade ainda nao confirmada (bloqueio B6, ver `lib/medidas.ts`).
   * Quem renderiza precisa tratar; imprimir "()" vazio nao serve.
   */
  unidade: string | null;
};

/**
 * Uma coluna por lado para medida bilateral, uma coluna para medida simples.
 * Sempre derivado de MEDIDAS, na ordem do catalogo — nunca escrito a mao.
 *
 * Uniao discriminada por `bloco`, nao mais por `lado`: no v2 e o bloco que diz
 * de qual objeto da resposta o valor sai (`amplitude` ou `saltos`), e cada ramo
 * restringe `chave` as chaves daquele bloco — entao a indexacao resolve para um
 * tipo unico, sem `as`. `lado` continua no tipo porque acompanha o bloco.
 */
export type ColunaMedida =
  | (ColunaMedidaBase & {
      bloco: "amplitude";
      chave: ChaveAmplitude;
      lado: Lado;
    })
  | (ColunaMedidaBase & {
      bloco: "salto";
      chave: ChaveSalto;
      lado: null;
    });

export function colunasDeMedida(): ColunaMedida[] {
  return MEDIDAS.flatMap((definicao): ColunaMedida[] => {
    if (definicao.bloco === "amplitude") {
      return (["direito", "esquerdo"] as const).map((lado) => ({
        bloco: "amplitude" as const,
        chave: definicao.chave,
        lado,
        rotulo: siglaComLado(definicao.sigla, lado),
        nomeCompleto: `${definicao.nome} (${lado})`,
        unidade: definicao.unidade,
      }));
    }

    return [
      {
        bloco: "salto" as const,
        chave: definicao.chave,
        lado: null,
        rotulo: definicao.sigla,
        nomeCompleto: definicao.nome,
        unidade: definicao.unidade,
      },
    ];
  });
}

// --- sincronia entre bloco e lateralidade ----------------------------------

type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * O tipo acima assume que bloco Amplitude == medida bilateral e bloco Salto ==
 * valor unico. Isso e verdade no catalogo de hoje, mas `bloco` e `bilateral`
 * sao campos independentes em `DefinicaoMedida` — nada impede uma medida futura
 * de furar a regra. Este check quebra a compilacao nesse dia, em vez de deixar
 * `valorDaColuna` ler um lado que nao existe. Mesmo modelo dos checks no fim de
 * `lib/schemas.ts`.
 */
const _amplitudeEhBilateral: Igual<
  ChaveAmplitude,
  Extract<(typeof MEDIDAS)[number], { bilateral: true }>["chave"]
> = true;
const _saltoEhValorUnico: Igual<
  ChaveSalto,
  Extract<(typeof MEDIDAS)[number], { bilateral: false }>["chave"]
> = true;
void _amplitudeEhBilateral;
void _saltoEhValorUnico;

/** Valor de uma coluna numa avaliacao — null quando nao medido. */
export function valorDaColuna(
  avaliacao: AvaliacaoCompleta,
  coluna: ColunaMedida,
): number | null {
  if (coluna.bloco === "amplitude") {
    return avaliacao.amplitude[coluna.chave][coluna.lado];
  }

  return avaliacao.saltos[coluna.chave];
}

/** Uma linha por coluna de medida, comparando duas avaliacoes. */
export type LinhaComparacao = {
  rotulo: string;
  nomeCompleto: string;
  /** null = unidade ainda nao confirmada (bloqueio B6). */
  unidade: string | null;
  anterior: number | null;
  atual: number | null;
  /** null quando `anterior` ou `atual` (ou ambos) sao null — nunca 0 nesse caso. */
  delta: number | null;
};

/**
 * Compara duas avaliacoes coluna a coluna. Todas as 13 linhas sempre saem
 * (eram 9 no v1; os quatro saltos novos entraram no catalogo), mesmo com os
 * dois lados nulos — a ausencia e informacao para o professor. Delta so e
 * calculado quando os dois valores sao numeros (0 incluido).
 */
export function montarLinhasComparacao(
  atual: AvaliacaoCompleta,
  anterior: AvaliacaoCompleta,
): LinhaComparacao[] {
  return colunasDeMedida().map((coluna) => {
    const valorAtual = valorDaColuna(atual, coluna);
    const valorAnterior = valorDaColuna(anterior, coluna);
    const delta =
      valorAtual !== null && valorAnterior !== null
        ? arredondar(valorAtual - valorAnterior)
        : null;

    return {
      rotulo: coluna.rotulo,
      nomeCompleto: coluna.nomeCompleto,
      unidade: coluna.unidade,
      anterior: valorAnterior,
      atual: valorAtual,
      delta,
    };
  });
}
