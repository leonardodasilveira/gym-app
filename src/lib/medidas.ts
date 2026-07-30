/**
 * Catalogo de medidas — fonte unica da verdade.
 *
 * Acrescentar medida nova = uma entrada aqui + o campo correspondente no
 * `medidasSchema` (src/lib/schemas.ts). O check de sincronia no fim daquele
 * arquivo quebra a compilacao se alguem esquecer a segunda parte.
 *
 * A `sigla` e o nome que o professor usa na planilha dele. Manter igual: e por
 * ela que ele reconhece a medida no relatorio.
 */

export type Lado = "direito" | "esquerdo";

export type DefinicaoMedida = {
  /** Chave no objeto `medidas` do DTO. */
  chave: string;
  /** Codigo persistido na tabela `Medida`. */
  codigo: string;
  /** Sigla da planilha do professor (TOR, QUA, IQT, SLB, CMJ). */
  sigla: string;
  /** Rotulo por extenso, pra tela. */
  nome: string;
  unidade: "cm";
  /** true = tem lado direito/esquerdo; false = valor unico. */
  bilateral: boolean;
};

export const MEDIDAS = [
  {
    chave: "mobilidadeTornozelo",
    codigo: "MOBILIDADE_TORNOZELO",
    sigla: "TOR",
    nome: "Mobilidade de tornozelo",
    unidade: "cm",
    bilateral: true,
  },
  {
    chave: "mobilidadeQuadril",
    codigo: "MOBILIDADE_QUADRIL",
    sigla: "QUA",
    nome: "Mobilidade de quadril",
    unidade: "cm",
    bilateral: true,
  },
  {
    chave: "amplitudeIsquiotibiais",
    codigo: "AMPLITUDE_ISQUIOTIBIAIS",
    sigla: "IQT",
    nome: "Amplitude de isquiotibiais",
    unidade: "cm",
    bilateral: true,
  },
  {
    // ⚠️ Ninguem decifrou o que SLB significa ainda (duvida 12 em
    // docs/planilha-atual.md). Nome por extenso fica pendente.
    chave: "slb",
    codigo: "SLB",
    sigla: "SLB",
    nome: "SLB",
    unidade: "cm",
    bilateral: true,
  },
  {
    chave: "cmj",
    codigo: "CMJ",
    sigla: "CMJ",
    nome: "Counter Movement Jump",
    unidade: "cm",
    bilateral: false,
  },
] as const satisfies readonly DefinicaoMedida[];

export type ChaveMedida = (typeof MEDIDAS)[number]["chave"];

const POR_CHAVE = new Map<string, DefinicaoMedida>(
  MEDIDAS.map((medida) => [medida.chave, medida]),
);

const POR_CODIGO = new Map<string, DefinicaoMedida>(
  MEDIDAS.map((medida) => [medida.codigo, medida]),
);

export const medidaPorChave = (chave: ChaveMedida): DefinicaoMedida =>
  POR_CHAVE.get(chave)!;

export const medidaPorCodigo = (codigo: string): DefinicaoMedida | undefined =>
  POR_CODIGO.get(codigo);

/** Sufixo de lado como aparece na planilha: `SLB DIR`, `SLB ESQ`. */
export const SUFIXO_LADO: Record<Lado, string> = {
  direito: "DIR",
  esquerdo: "ESQ",
};

/** `siglaComLado("SLB", "esquerdo")` -> `"SLB ESQ"`. */
export const siglaComLado = (sigla: string, lado: Lado): string =>
  `${sigla} ${SUFIXO_LADO[lado]}`;

/** `rotuloComLado("Mobilidade de tornozelo", "direito")` -> `"... (direito)"`. */
export const rotuloComLado = (nome: string, lado: Lado): string =>
  `${nome} (${lado})`;
