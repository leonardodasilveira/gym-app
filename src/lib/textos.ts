/**
 * ⚠️ TEXTOS PLACEHOLDER (lorem) do relatorio.
 *
 * No processo atual o professor escreve as secoes 5, 6, 8 e 9 do relatorio.
 * Ainda nao sabemos se ele quer escrever no sistema ou se espera que o sistema
 * gere (ver duvida 5 em docs/planilha-atual.md). Ate la, texto de enchimento
 * pro front conseguir montar o layout.
 */

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod " +
  "tempor incididunt ut labore et dolore magna aliqua.";

const LOREM_CURTO = "Ut enim ad minim veniam, quis nostrud exercitation ullamco.";

export type TextosRelatorio = {
  melhorias: string[];
  pontosAtencao: string[];
  recomendacoes: { foco: string; objetivo: string; estrategias: string[] }[];
  conclusao: string;
};

export function textosPlaceholder(): TextosRelatorio {
  return {
    melhorias: [LOREM_CURTO, LOREM_CURTO, LOREM_CURTO],
    pontosAtencao: [LOREM_CURTO, LOREM_CURTO],
    recomendacoes: [
      {
        foco: "Forca",
        objetivo: LOREM_CURTO,
        estrategias: [LOREM_CURTO, LOREM_CURTO, LOREM_CURTO],
      },
      {
        foco: "Potencia",
        objetivo: LOREM_CURTO,
        estrategias: [LOREM_CURTO, LOREM_CURTO],
      },
      {
        foco: "Velocidade",
        objetivo: LOREM_CURTO,
        estrategias: [LOREM_CURTO, LOREM_CURTO],
      },
    ],
    conclusao: `${LOREM} ${LOREM_CURTO}`,
  };
}
