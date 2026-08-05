/**
 * Catalogo de medidas — fonte unica da verdade.
 *
 * Acrescentar medida nova = uma entrada aqui + o campo correspondente no bloco
 * certo de `src/lib/schemas.ts`. O check de sincronia no fim daquele arquivo
 * quebra a compilacao se alguem esquecer a segunda parte.
 *
 * A `sigla` e o nome que o professor usa na planilha dele. Manter igual: e por
 * ela que ele reconhece a medida no relatorio.
 *
 * ## v2: dois blocos, e unidade deixou de ser sempre "cm"
 *
 * O modelo v2 (docs/evaluation-model-v2-proposal.md) organiza a avaliacao em
 * tres blocos. Dois deles — Amplitude e Salto — tem a mesma forma de dado (um
 * codigo, um ou dois valores) e continuam morando aqui, distinguidos pelo campo
 * `bloco`. O terceiro (Velocidade) tem duas grandezas por exercicio e vive em
 * `EXERCICIOS_VELOCIDADE`, mais abaixo.
 *
 * `unidade` deixou de ser o literal `"cm"` e passou a aceitar `null`. Isso NAO e
 * frouxidao: e o bloqueio B6 (`evaluation-model-v2-proposal.md` §3.2) escrito no
 * tipo. Os quatro saltos novos podem ser altura (cm), razao adimensional (EUR,
 * RSI) ou percentual (REL %), e ninguem confirmou qual. `null` significa
 * "unidade ainda desconhecida" e e o unico valor honesto ate o cliente
 * responder — gravar `"cm"` provisorio mentiria no banco e no relatorio.
 */

export type Lado = "direito" | "esquerdo";

/** Bloco de apresentacao da avaliacao. Velocidade nao entra: nao e `Medida`. */
export type BlocoMedida = "amplitude" | "salto";

export type DefinicaoMedida = {
  /** Chave dentro do bloco correspondente do DTO (`amplitude.tornozelo`). */
  chave: string;
  /** Codigo persistido na tabela `Medida`. */
  codigo: string;
  /** Sigla da planilha do professor (TOR, QUA, IQT, SLB, CMJ). */
  sigla: string;
  /** Rotulo por extenso, pra tela. */
  nome: string;
  /** `null` = ainda nao confirmada pelo cliente (bloqueio B6). */
  unidade: string | null;
  /** true = tem lado direito/esquerdo; false = valor unico. */
  bilateral: boolean;
  bloco: BlocoMedida;
};

export const MEDIDAS = [
  {
    chave: "tornozelo",
    codigo: "MOBILIDADE_TORNOZELO",
    sigla: "TOR",
    nome: "Mobilidade de tornozelo",
    unidade: "cm",
    bilateral: true,
    bloco: "amplitude",
  },
  {
    chave: "quadril",
    codigo: "MOBILIDADE_QUADRIL",
    sigla: "QUA",
    nome: "Mobilidade de quadril",
    unidade: "cm",
    bilateral: true,
    bloco: "amplitude",
  },
  {
    chave: "isquiotibiais",
    codigo: "AMPLITUDE_ISQUIOTIBIAIS",
    sigla: "IQT",
    nome: "Amplitude de isquiotibiais",
    unidade: "cm",
    bilateral: true,
    bloco: "amplitude",
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
    bloco: "amplitude",
  },
  {
    chave: "cmj",
    codigo: "CMJ",
    sigla: "CMJ",
    nome: "Counter Movement Jump",
    unidade: "cm",
    bilateral: false,
    bloco: "salto",
  },
  // --- os quatro saltos ainda sem nome nem unidade (bloqueio B6) ------------
  //
  // Codigo, sigla e nome sao PROVISORIOS e reversiveis: nenhum dado real existe
  // sob eles (o banco so tem seed ficticio, `evaluation-model-v2-proposal.md`
  // §13), entao renomear depois e uma migration de UPDATE, nao uma perda.
  // A `unidade: null` e o que impede o relatorio de imprimir "38,1 cm" sem
  // saber se aquilo e centimetro.
  {
    chave: "salto2",
    codigo: "SALTO_2",
    sigla: "SALTO 2",
    nome: "Resultado de salto 2",
    unidade: null,
    bilateral: false,
    bloco: "salto",
  },
  {
    chave: "salto3",
    codigo: "SALTO_3",
    sigla: "SALTO 3",
    nome: "Resultado de salto 3",
    unidade: null,
    bilateral: false,
    bloco: "salto",
  },
  {
    chave: "salto4",
    codigo: "SALTO_4",
    sigla: "SALTO 4",
    nome: "Resultado de salto 4",
    unidade: null,
    bilateral: false,
    bloco: "salto",
  },
  {
    chave: "salto5",
    codigo: "SALTO_5",
    sigla: "SALTO 5",
    nome: "Resultado de salto 5",
    unidade: null,
    bilateral: false,
    bloco: "salto",
  },
] as const satisfies readonly DefinicaoMedida[];

export type ChaveMedida = (typeof MEDIDAS)[number]["chave"];

/** Chaves do bloco Amplitude — as 4 bilaterais. */
export type ChaveAmplitude = Extract<
  (typeof MEDIDAS)[number],
  { bloco: "amplitude" }
>["chave"];

/** Chaves do bloco Salto — CMJ + os 4 provisorios. */
export type ChaveSalto = Extract<
  (typeof MEDIDAS)[number],
  { bloco: "salto" }
>["chave"];

export const MEDIDAS_AMPLITUDE = MEDIDAS.filter(
  (medida) => medida.bloco === "amplitude",
);

export const MEDIDAS_SALTO = MEDIDAS.filter((medida) => medida.bloco === "salto");

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

// --- bloco Velocidade ------------------------------------------------------

/**
 * Exercicios do bloco Velocidade. Conjunto fechado pelo cliente em dois
 * (`evaluation-model-v2-proposal.md` §3.3); acrescentar um terceiro e
 * acrescentar uma entrada aqui + a chave no `velocidadeSchema`.
 *
 * ⚠️ `SQUAT_JUMP` aqui NAO e o mesmo dado que um eventual salto `SJ` do bloco
 * Salto — a planilha trata os dois como colunas diferentes (`planilha-atual.md`
 * §54-55). Segue como duvida aberta com o cliente (§15.4 da proposta).
 */
export type DefinicaoExercicio = {
  /** Chave dentro de `velocidade` no DTO. */
  chave: string;
  /** Codigo persistido na tabela `MedidaVelocidade`. */
  codigo: string;
  nome: string;
};

export const EXERCICIOS_VELOCIDADE = [
  { chave: "squatJump", codigo: "SQUAT_JUMP", nome: "Squat Jump" },
  { chave: "agachamento", codigo: "AGACHAMENTO", nome: "Agachamento" },
] as const satisfies readonly DefinicaoExercicio[];

export type ChaveExercicio = (typeof EXERCICIOS_VELOCIDADE)[number]["chave"];

const EXERCICIO_POR_CODIGO = new Map<string, DefinicaoExercicio>(
  EXERCICIOS_VELOCIDADE.map((exercicio) => [exercicio.codigo, exercicio]),
);

export const exercicioPorCodigo = (
  codigo: string,
): DefinicaoExercicio | undefined => EXERCICIO_POR_CODIGO.get(codigo);

// --- rotulos ---------------------------------------------------------------

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
