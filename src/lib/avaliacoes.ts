import {
  EXERCICIOS_VELOCIDADE,
  MEDIDAS,
  MEDIDAS_AMPLITUDE,
  MEDIDAS_SALTO,
  medidaPorCodigo,
  siglaComLado,
  type ChaveMedida,
  type Lado,
} from "@/lib/medidas";
import type { AmplitudeDTO, SaltosDTO, VelocidadeDTO } from "@/lib/schemas";

/**
 * Conversao entre o formato do contrato do front (tres blocos de chaves fixas)
 * e o formato do banco (tabelas `Medida` e `MedidaVelocidade`, uma linha por
 * codigo).
 *
 * Regra que atravessa o arquivo inteiro: **toda chave sempre presente, `null`
 * onde nao foi medido**. Nenhuma funcao daqui pode transformar ausencia em zero
 * — e o defeito herdado da planilha que o produto existe pra eliminar
 * (docs/planilha-atual.md §139-141).
 */

export type LinhaMedida = {
  codigo: string;
  unidade: string | null;
  direito: number | null;
  esquerdo: number | null;
  valor: number | null;
};

export type LinhaVelocidade = {
  codigo: string;
  cargaKg: number | null;
  tempoSegundos: number | null;
};

// --- blocos Amplitude e Salto ---------------------------------------------

/**
 * Os dois blocos viram linhas da mesma tabela `Medida`: a distincao entre eles e
 * de apresentacao (o campo `bloco` do catalogo), nao de forma do dado. A
 * `unidade` vem do catalogo, nunca do payload — o v2 nao transporta unidade.
 *
 * Os conversores sao **por bloco**, e nao um so pros dois, porque o PATCH aceita
 * substituir `amplitude` sem tocar em `saltos` (e vice-versa). Com um conversor
 * unico, regravar um bloco exigiria apagar as linhas do outro junto.
 */
export function amplitudeParaLinhas(amplitude: AmplitudeDTO): LinhaMedida[] {
  return MEDIDAS_AMPLITUDE.map((definicao) => {
    const par = amplitude[definicao.chave as keyof AmplitudeDTO];
    return {
      codigo: definicao.codigo,
      unidade: definicao.unidade,
      direito: par.direito,
      esquerdo: par.esquerdo,
      valor: null,
    };
  });
}

export function saltosParaLinhas(saltos: SaltosDTO): LinhaMedida[] {
  return MEDIDAS_SALTO.map((definicao) => ({
    codigo: definicao.codigo,
    unidade: definicao.unidade,
    direito: null,
    esquerdo: null,
    valor: saltos[definicao.chave as keyof SaltosDTO],
  }));
}

/** Os dois blocos de uma vez — o caminho do POST, que sempre recebe ambos. */
export function medidasParaLinhas(
  amplitude: AmplitudeDTO,
  saltos: SaltosDTO,
): LinhaMedida[] {
  return [...amplitudeParaLinhas(amplitude), ...saltosParaLinhas(saltos)];
}

/** Codigos persistidos de cada bloco — o `where` do delete no PATCH. */
export const CODIGOS_AMPLITUDE = MEDIDAS_AMPLITUDE.map((m) => m.codigo);
export const CODIGOS_SALTO = MEDIDAS_SALTO.map((m) => m.codigo);

/** Linhas do banco -> bloco `amplitude` no formato que o front espera. */
export function linhasParaAmplitude(linhas: LinhaMedida[]): AmplitudeDTO {
  const porCodigo = new Map(linhas.map((linha) => [linha.codigo, linha]));

  const entradas = MEDIDAS_AMPLITUDE.map((definicao) => {
    const linha = porCodigo.get(definicao.codigo);
    return [
      definicao.chave,
      { direito: linha?.direito ?? null, esquerdo: linha?.esquerdo ?? null },
    ] as const;
  });

  return Object.fromEntries(entradas) as AmplitudeDTO;
}

/** Linhas do banco -> bloco `saltos` no formato que o front espera. */
export function linhasParaSaltos(linhas: LinhaMedida[]): SaltosDTO {
  const porCodigo = new Map(linhas.map((linha) => [linha.codigo, linha]));

  const entradas = MEDIDAS_SALTO.map(
    (definicao) =>
      [definicao.chave, porCodigo.get(definicao.codigo)?.valor ?? null] as const,
  );

  return Object.fromEntries(entradas) as SaltosDTO;
}

// --- bloco Velocidade ------------------------------------------------------

/**
 * `velocidade` do DTO -> linhas prontas pro `create` do Prisma.
 *
 * Grava as duas linhas sempre, mesmo com carga e tempo `null`. Poderia omitir a
 * linha vazia e economizar dois registros, mas isso reintroduziria a ambiguidade
 * entre "exercicio nao medido" e "exercicio nunca existiu neste modelo" na hora
 * de ler de volta. Duas linhas por avaliacao e um preco irrisorio pela
 * simetria com `Medida`.
 */
export function velocidadeParaLinhas(
  velocidade: VelocidadeDTO,
): LinhaVelocidade[] {
  return EXERCICIOS_VELOCIDADE.map((definicao) => {
    const exercicio = velocidade[definicao.chave as keyof VelocidadeDTO];
    return {
      codigo: definicao.codigo,
      cargaKg: exercicio.cargaKg,
      tempoSegundos: exercicio.tempoSegundos,
    };
  });
}

/** Linhas do banco -> bloco `velocidade` no formato que o front espera. */
export function linhasParaVelocidade(
  linhas: LinhaVelocidade[],
): VelocidadeDTO {
  const porCodigo = new Map(linhas.map((linha) => [linha.codigo, linha]));

  const entradas = EXERCICIOS_VELOCIDADE.map((definicao) => {
    const linha = porCodigo.get(definicao.codigo);
    return [
      definicao.chave,
      {
        cargaKg: linha?.cargaKg ?? null,
        tempoSegundos: linha?.tempoSegundos ?? null,
      },
    ] as const;
  });

  return Object.fromEntries(entradas) as VelocidadeDTO;
}

// --- formato achatado pro relatorio ---------------------------------------

export type MedidaDetalhada = {
  chave: ChaveMedida;
  codigo: string;
  sigla: string;
  nome: string;
  unidade: string | null;
  bilateral: boolean;
  bloco: "amplitude" | "salto";
  /** Uma entrada por lado, ou uma so quando a medida e de valor unico. */
  valores: { sigla: string; rotulo: string; lado: Lado | null; valor: number | null }[];
};

/**
 * Formato achatado pro relatorio: cada valor ja vem com a sigla do professor
 * (`SLB ESQ`) pronta pra imprimir, sem o front precisar montar rotulo.
 *
 * `unidade` pode vir `null` (os quatro saltos, bloqueio B6). Quem renderiza
 * **precisa** tratar esse caso — imprimir o numero sem sufixo e o comportamento
 * correto, nunca chutar "cm".
 */
export function linhasParaMedidasDetalhadas(
  linhas: LinhaMedida[],
): MedidaDetalhada[] {
  const porCodigo = new Map(linhas.map((linha) => [linha.codigo, linha]));

  return MEDIDAS.map((definicao) => {
    const linha = porCodigo.get(definicao.codigo);

    const valores = definicao.bilateral
      ? (["direito", "esquerdo"] as const).map((lado) => ({
          sigla: siglaComLado(definicao.sigla, lado),
          rotulo: `${definicao.nome} (${lado})`,
          lado: lado as Lado,
          valor: linha?.[lado] ?? null,
        }))
      : [
          {
            sigla: definicao.sigla,
            rotulo: definicao.nome,
            lado: null,
            valor: linha?.valor ?? null,
          },
        ];

    return {
      chave: definicao.chave,
      codigo: definicao.codigo,
      sigla: definicao.sigla,
      nome: definicao.nome,
      unidade: linha?.unidade ?? definicao.unidade,
      bilateral: definicao.bilateral,
      bloco: definicao.bloco,
      valores,
    };
  });
}

/** Sigla da planilha a partir do codigo persistido — `SLB` + lado. */
export function siglaDaMedida(codigo: string, lado?: Lado): string {
  const definicao = medidaPorCodigo(codigo);
  const sigla = definicao?.sigla ?? codigo;
  return lado ? siglaComLado(sigla, lado) : sigla;
}

/** "2026-07-30" -> Date em meia-noite UTC (sem surpresa de fuso). */
export const paraData = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Date -> "2026-07-30". */
export const formatarData = (data: Date): string =>
  data.toISOString().slice(0, 10);

// --- serializacao da resposta ---------------------------------------------

/**
 * Forma minima da avaliacao que o serializador precisa. Estrutural de proposito,
 * igual ao `AvaliacaoParaRelatorio` de src/lib/relatorio.ts: o resultado do
 * Prisma satisfaz sem precisar do tipo gerado.
 *
 * E a **entrada** do serializador. A saida e `AvaliacaoResponse`, mais abaixo.
 */
type AvaliacaoParaSerializar = {
  id: string;
  alunoId: string;
  dataAvaliacao: Date;
  observacoes: string | null;
  criadoEm: Date;
  medidas: LinhaMedida[];
  velocidades: LinhaVelocidade[];
};

/**
 * Devolve a avaliacao no mesmo formato do DTO de entrada, mais id e criadoEm.
 *
 * A simetria entrada/saida e deliberada: o front usa a resposta do GET pra
 * preencher o formulario de edicao sem tabela de traducao. Por isso a saida
 * tambem nao carrega unidade — quem precisa de rotulo le o catalogo.
 */
export function serializarAvaliacao(avaliacao: AvaliacaoParaSerializar) {
  return {
    id: avaliacao.id,
    alunoId: avaliacao.alunoId,
    dataAvaliacao: formatarData(avaliacao.dataAvaliacao),
    amplitude: linhasParaAmplitude(avaliacao.medidas),
    saltos: linhasParaSaltos(avaliacao.medidas),
    velocidade: linhasParaVelocidade(avaliacao.velocidades),
    observacoes: avaliacao.observacoes,
    criadoEm: avaliacao.criadoEm.toISOString(),
  };
}

/**
 * Contrato de saida de `GET /avaliacoes` e `GET /avaliacoes/:id`. Derivado da
 * serializacao, nao declarado a mao — mudar o formato acima quebra o typecheck
 * de quem consome, que e a mitigacao pedida pelo risco R3 do frontend-plan.md.
 *
 * O front nao precisa fazer `ReturnType<typeof serializarAvaliacao>`:
 *
 *   import type { AvaliacaoResponse } from "@/lib/avaliacoes";
 *
 * Importar daqui e seguro: este modulo nao toca `@/lib/prisma` nem `@/lib/http`,
 * entao nada server-only vai junto (frontend-plan.md 7.4). E todos os campos ja
 * sao primitivos ou string — nenhum `Date` sobrevive ate a resposta —, entao o
 * tipo vale igual antes e depois do JSON.
 */
export type AvaliacaoResponse = ReturnType<typeof serializarAvaliacao>;

/** Bloco de velocidade como sai na resposta. */
export type VelocidadeResponse = AvaliacaoResponse["velocidade"];

/** Um exercicio de velocidade como sai na resposta. */
export type ExercicioResponse = VelocidadeResponse[keyof VelocidadeResponse];

/** `include` padrao pra carregar a avaliacao inteira de uma vez. */
export const avaliacaoCompleta = {
  medidas: true,
  velocidades: true,
} as const;
