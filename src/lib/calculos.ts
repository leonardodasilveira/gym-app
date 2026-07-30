/**
 * ⚠️ CALCULOS PROVISORIOS — TODOS OS NUMEROS DAQUI SAO APROXIMACOES NOSSAS.
 *
 * O professor tem as formulas de verdade na planilha (V0, F0, Pmax, carga
 * otima, indice de qualidade, score). Enquanto elas nao chegam, este modulo
 * produz valores plausiveis pro front ter o que renderizar e pra demo rodar.
 *
 * Tudo que e chute esta neste arquivo de proposito: trocar as formulas depois
 * deve ser mexer so aqui. Ver docs/planilha-atual.md, secao "O buraco".
 */

/**
 * Deslocamento medio por repeticao, em metros.
 *
 * ⚠️ CHUTE. O contrato do front manda tempo (s) e repeticoes, nao velocidade.
 * Pra converter em m/s falta a amplitude do movimento, que ninguem mediu ainda.
 * Perguntar ao professor: ele mede amplitude? E por atleta ou valor fixo?
 */
const DESLOCAMENTO_POR_CODIGO: Record<string, number> = {
  SALTO_AGACHADO: 0.5,
  AGACHAMENTO: 0.5,
};

const DESLOCAMENTO_PADRAO_M = 0.5;

export function deslocamentoDoExercicio(codigo: string): number {
  return DESLOCAMENTO_POR_CODIGO[codigo] ?? DESLOCAMENTO_PADRAO_M;
}

/**
 * Velocidade media da tentativa, em m/s.
 *
 * ⚠️ APROXIMACAO: distancia total percorrida dividida pelo tempo total.
 * Isso inclui fase excentrica e pausas, entao o numero fica bem abaixo da VMP
 * (velocidade media propulsiva) que o professor usa hoje na planilha.
 * Serve pra ordenar e comparar; nao serve como valor clinico.
 */
export function velocidadeMedia(input: {
  codigo: string;
  repeticoes: number;
  tempoSegundos: number;
}): number {
  const distancia = input.repeticoes * deslocamentoDoExercicio(input.codigo);
  return arredondar(distancia / input.tempoSegundos, 3);
}

export type PontoCurva = {
  testeCodigo: string;
  testeNome: string;
  cargaKg: number;
  velocidadeMs: number;
};

export type AjusteCurva = {
  /** Coeficiente angular da reta, em m/s por kg (negativo). */
  inclinacao: number;
  /** Velocidade teorica maxima: intercepto em carga = 0. */
  v0: number;
  /** Carga teorica maxima: onde a reta cruza velocidade = 0. */
  f0: number;
  /** Qualidade do ajuste linear, 0 a 1. */
  r2: number;
  /** Carga de potencia otima. ⚠️ Aproximada por F0/2. */
  cargaOtimaKg: number;
  /** Velocidade na carga otima. ⚠️ Aproximada por V0/2. */
  velocidadeOtimaMs: number;
};

/**
 * Regressao linear simples (minimos quadrados) sobre os pontos carga x velocidade.
 *
 * ⚠️ A curva de verdade do relatorio do professor NAO sai daqui — os valores de
 * V0/F0/Pmax dele nao batem com uma regressao sobre os pontos do grafico
 * (conferido em docs/planilha-atual.md). Isto aqui e um substituto honesto ate
 * termos a formula real.
 *
 * Retorna null com menos de 2 pontos ou se todas as cargas forem iguais.
 */
export function ajustarCurva(pontos: PontoCurva[]): AjusteCurva | null {
  if (pontos.length < 2) return null;

  const n = pontos.length;
  const xs = pontos.map((p) => p.cargaKg);
  const ys = pontos.map((p) => p.velocidadeMs);

  const mediaX = xs.reduce((a, b) => a + b, 0) / n;
  const mediaY = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mediaX) * (ys[i] - mediaY);
    sxx += (xs[i] - mediaX) ** 2;
  }

  // Todas as cargas iguais: reta vertical, sem ajuste possivel.
  if (sxx === 0) return null;

  const inclinacao = sxy / sxx;
  const v0 = mediaY - inclinacao * mediaX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const previsto = v0 + inclinacao * xs[i];
    ssRes += (ys[i] - previsto) ** 2;
    ssTot += (ys[i] - mediaY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Reta plana ou subindo com a carga: fisicamente incoerente, F0 nao existe.
  const f0 = inclinacao < 0 ? -v0 / inclinacao : 0;

  return {
    inclinacao: arredondar(inclinacao, 5),
    v0: arredondar(v0, 3),
    f0: arredondar(f0, 1),
    r2: arredondar(r2, 3),
    cargaOtimaKg: arredondar(f0 / 2, 1),
    velocidadeOtimaMs: arredondar(v0 / 2, 3),
  };
}

/** Rotulo do perfil a partir da inclinacao. ⚠️ Faixas inventadas. */
export function classificarPerfil(ajuste: AjusteCurva | null): string {
  if (!ajuste) return "Dados insuficientes";
  if (ajuste.inclinacao > -0.008) return "Orientado a forca";
  if (ajuste.inclinacao > -0.015) return "Equilibrado";
  return "Orientado a velocidade";
}

/**
 * Score 0-100. ⚠️ TOTALMENTE PROVISORIO.
 * Combina V0 e F0 normalizados por constantes arbitrarias, so pra tela ter um
 * numero que se move quando os dados mudam.
 */
export function calcularScore(ajuste: AjusteCurva | null): {
  valor: number;
  nivel: string;
} {
  if (!ajuste) return { valor: 0, nivel: "Sem dados" };

  const notaVelocidade = Math.min(ajuste.v0 / 2, 1) * 50;
  const notaForca = Math.min(ajuste.f0 / 150, 1) * 50;
  const valor = Math.round(notaVelocidade + notaForca);

  const nivel =
    valor >= 80 ? "Alto" : valor >= 60 ? "Medio" : valor >= 40 ? "Baixo" : "Inicial";

  return { valor, nivel };
}

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}
