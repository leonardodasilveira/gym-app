export const SEMANAS_PADRAO = 8;

export const OPCOES_PERIODO = [
  { rotulo: "8 semanas", valorUrl: "8" },
  { rotulo: "12 semanas", valorUrl: "12" },
  { rotulo: "26 semanas", valorUrl: "26" },
  { rotulo: "52 semanas", valorUrl: "52" },
  { rotulo: "Todo o histórico", valorUrl: "todo" },
] as const;

export type Periodo = { semanas: number | null; valorUrl: string };

const PERIODOS_CONHECIDOS = new Map<string, number>([
  ["8", 8],
  ["12", 12],
  ["26", 26],
  ["52", 52],
]);

const PERIODO_PADRAO: Periodo = {
  semanas: SEMANAS_PADRAO,
  valorUrl: String(SEMANAS_PADRAO),
};

/**
 * Normaliza a entrada para o conjunto fechado que a interface representa.
 * Nunca devolve ao backend um valor arbitrário capaz de produzir 422.
 */
export function periodoDosParametros(
  bruto: string | string[] | undefined,
): Periodo {
  if (typeof bruto !== "string") {
    return PERIODO_PADRAO;
  }

  if (bruto === "todo") {
    return { semanas: null, valorUrl: "todo" };
  }

  const semanas = PERIODOS_CONHECIDOS.get(bruto);
  return semanas === undefined
    ? PERIODO_PADRAO
    : { semanas, valorUrl: bruto };
}

/** Mantém a ausência da query como forma canônica do período padrão. */
export function hrefComPeriodo(baseHref: string, valorUrl: string): string {
  const caminho = baseHref.split(/[?#]/, 1)[0];
  return valorUrl === String(SEMANAS_PADRAO)
    ? caminho
    : `${caminho}?semanas=${encodeURIComponent(valorUrl)}`;
}
