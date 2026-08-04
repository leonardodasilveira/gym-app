import { describe, expect, test } from "vitest";

import {
  ajustarCurva,
  calcularScore,
  classificarPerfil,
  deslocamentoDoExercicio,
  velocidadeMedia,
  type PontoCurva,
} from "@/lib/calculos";
import { PONTOS_LINHA_1001, RELATORIO_PUBLICADO } from "@/lib/__fixtures__/planilha";

const ponto = (cargaKg: number, velocidadeMs: number): PontoCurva => ({
  testeCodigo: "AGACHAMENTO",
  testeNome: "Agachamento",
  cargaKg,
  velocidadeMs,
});

/**
 * O risco numero 1 do projeto e "reproduzir corretamente as formulas"
 * (docs/planilha-atual.md:156-158), e todo este modulo e chute assumido. Estes
 * testes existem pra que trocar chute por formula real seja uma mudanca medida,
 * e nao um salto no escuro.
 */
describe("ajustarCurva sobre a curva real da planilha", () => {
  test("reproduz a regressao registrada em planilha-atual.md", () => {
    const ajuste = ajustarCurva(PONTOS_LINHA_1001);

    // Os mesmos numeros da tabela em docs/planilha-atual.md:106-110, coluna
    // "Calculado (OLS sobre os 8 pontos)". Se algum deles mudar sem que alguem
    // tenha mexido de proposito na formula, e regressao.
    expect(ajuste).not.toBeNull();
    expect(ajuste!.inclinacao).toBe(-0.01167);
    expect(ajuste!.v0).toBe(1.687);
    expect(ajuste!.f0).toBe(144.5);
  });

  test("com os 8 pontos o r2 fica abaixo de 1, ou seja, mede alguma coisa", () => {
    const ajuste = ajustarCurva(PONTOS_LINHA_1001);

    // Contraste proposital com o bloco de degeneracao mais abaixo: aqui o r2 e
    // um indice de qualidade de verdade, porque sobra dispersao pra ele medir.
    expect(ajuste!.r2).toBe(0.939);
    expect(ajuste!.r2).toBeLessThan(1);
  });

  test("⚠️ ainda NAO reproduz os numeros publicados pelo professor", () => {
    const ajuste = ajustarCurva(PONTOS_LINHA_1001)!;

    // Este teste documenta o "buraco" (docs/planilha-atual.md:100-125): a
    // regressao simples sobre carga x velocidade nao chega nos valores do
    // relatorio. A hipotese e que V0/F0/Pmax saiam de um perfil forca-velocidade
    // (Samozino), nao desta reta.
    //
    // ELE DEVE FALHAR quando a formula real entrar — e o sinal de que chegamos
    // la. Nesse dia, trocar por igualdade contra RELATORIO_PUBLICADO.
    expect(Math.abs(ajuste.f0 - RELATORIO_PUBLICADO.f0)).toBeGreaterThan(20);
    expect(Math.abs(ajuste.v0 - RELATORIO_PUBLICADO.v0)).toBeGreaterThan(0.15);
  });

  test("os numeros do proprio relatorio nao fecham entre si", () => {
    // Evidencia de que o relatorio mistura dois modelos: pela definicao de F0
    // (onde a reta cruza velocidade zero), F0 teria que ser V0 / |inclinacao|.
    const f0Coerente = RELATORIO_PUBLICADO.v0 / Math.abs(RELATORIO_PUBLICADO.inclinacao);

    expect(f0Coerente).toBeCloseTo(188, 0);
    expect(RELATORIO_PUBLICADO.f0).toBe(122.1);
  });
});

/**
 * Estes casos decidem discussao de modelagem: eles mostram, em codigo, quanto
 * a curva depende de ter varios pontos por avaliacao. A planilha traz de 4 a 8
 * (docs/vbt.md:129-134).
 */
describe("ajustarCurva degenera quando faltam pontos", () => {
  test("menos de 2 pontos nao produz ajuste", () => {
    expect(ajustarCurva([])).toBeNull();
    expect(ajustarCurva([ponto(20, 1.5)])).toBeNull();
  });

  test("cargas todas iguais nao produzem ajuste", () => {
    expect(ajustarCurva([ponto(20, 1.5), ponto(20, 1.2)])).toBeNull();
  });

  test("com exatamente 2 pontos o r2 e sempre 1, seja qual for o par", () => {
    // A reta passa exatamente pelos dois pontos, entao a soma dos residuos e
    // zero por construcao. O "indice de qualidade da curva" vira constante e
    // deixa de ser informacao — o numero continua aparecendo no relatorio,
    // parecendo um ajuste perfeito, sem nada por tras.
    const pares: [PontoCurva, PontoCurva][] = [
      [ponto(20, 1.5), ponto(40, 1.22)],
      [ponto(50, 1.1), ponto(70, 0.93)],
      [ponto(1, 0.1), ponto(999, 0.05)],
    ];

    for (const par of pares) {
      expect(ajustarCurva(par)!.r2).toBe(1);
    }
  });

  test("inclinacao nao-negativa zera o F0 em vez de inventar carga", () => {
    // Velocidade subindo com a carga e fisicamente incoerente; melhor devolver
    // zero do que uma carga maxima negativa.
    expect(ajustarCurva([ponto(20, 1.0), ponto(40, 1.2)])!.f0).toBe(0);
  });
});

describe("velocidadeMedia — conversao provisoria de tempo em velocidade", () => {
  test("usa o deslocamento estimado de 0,5 m por repeticao", () => {
    // 2 reps x 0,5 m / 1,43 s
    expect(velocidadeMedia({ codigo: "AGACHAMENTO", repeticoes: 2, tempoSegundos: 1.43 })).toBe(
      0.699,
    );
  });

  test("codigo desconhecido cai no padrao em silencio", () => {
    // Registrado de proposito: se os codigos de exercicio mudarem, o calculo
    // NAO quebra — ele passa a usar 0,5 m calado. Vale lembrar disso em
    // qualquer renomeacao.
    expect(deslocamentoDoExercicio("NAO_EXISTE")).toBe(0.5);
    expect(deslocamentoDoExercicio("AGACHAMENTO")).toBe(0.5);
  });
});

describe("rotulos derivados do ajuste", () => {
  test("sem ajuste, perfil e score assumem o estado sem dados", () => {
    expect(classificarPerfil(null)).toBe("Dados insuficientes");
    expect(calcularScore(null)).toEqual({ valor: 0, nivel: "Sem dados" });
  });

  test("⚠️ na curva real, nosso rotulo discorda do rotulo do professor", () => {
    const ajuste = ajustarCurva(PONTOS_LINHA_1001);

    // Para esta mesma avaliacao (linha 1001), o relatorio do professor diz
    // "Levemente orientado a velocidade". As faixas de calculos.ts:124-130 sao
    // inventadas e classificam a mesma curva como "Equilibrado".
    //
    // Segundo desacordo com o material real, junto com V0/F0 — e mais barato de
    // resolver, porque e so calibrar as faixas quando o `.xlsx` chegar. Quando
    // calibrar, este teste falha e vira igualdade com o rotulo do professor.
    expect(classificarPerfil(ajuste)).toBe("Equilibrado");
  });

  test("o score se move quando a curva melhora", () => {
    const fraco = ajustarCurva([ponto(20, 0.6), ponto(60, 0.3)]);
    const forte = ajustarCurva([ponto(20, 1.8), ponto(120, 0.9)]);

    expect(calcularScore(forte).valor).toBeGreaterThan(calcularScore(fraco).valor);
  });
});
