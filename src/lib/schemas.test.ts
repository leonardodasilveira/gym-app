import { describe, expect, test } from "vitest";

import {
  atualizarAvaliacaoSchema,
  criarAvaliacaoSchema,
  type CriarAvaliacaoDTO,
} from "@/lib/schemas";

/**
 * Exemplos de `docs/evaluation-model-v2-proposal.md` secao 5, copiados
 * literalmente. Sao os mesmos que o front usa em
 * `src/features/avaliacoes/__fixtures__/avaliacaoV2.ts` — mantidos em duplicata
 * de proposito enquanto o front nao apaga `contrato-v2.ts`, pra que o backend
 * nao dependa de um modulo marcado pra remocao.
 */
const COMPLETO: CriarAvaliacaoDTO = {
  alunoId: "8b4dfdff-ba28-4085-a11d-43062d642925",
  dataAvaliacao: "2026-08-02",
  amplitude: {
    tornozelo: { direito: 11.5, esquerdo: 12.1 },
    quadril: { direito: 18.4, esquerdo: 17.8 },
    isquiotibiais: { direito: 21, esquerdo: 20.7 },
    slb: { direito: 32.5, esquerdo: 31.9 },
  },
  saltos: { cmj: 42.8, salto2: 38.1, salto3: 35, salto4: 30.2, salto5: 28.9 },
  velocidade: {
    squatJump: { cargaKg: 20, tempoSegundos: 1.43 },
    agachamento: { cargaKg: 60, tempoSegundos: 1.91 },
  },
  observacoes: "Boa evolucao na mobilidade.",
};

const PARCIAL: CriarAvaliacaoDTO = {
  alunoId: "8b4dfdff-ba28-4085-a11d-43062d642925",
  dataAvaliacao: "2026-08-02",
  amplitude: {
    tornozelo: { direito: 11.5, esquerdo: 12.1 },
    quadril: { direito: null, esquerdo: null },
    isquiotibiais: { direito: null, esquerdo: null },
    slb: { direito: null, esquerdo: null },
  },
  saltos: { cmj: null, salto2: null, salto3: null, salto4: null, salto5: null },
  velocidade: {
    squatJump: { cargaKg: null, tempoSegundos: null },
    agachamento: { cargaKg: null, tempoSegundos: null },
  },
};

/** Copia sem uma chave — pra exercitar "chave ausente", que nao e o mesmo que `null`. */
const sem = <T extends object, K extends keyof T>(
  objeto: T,
  chave: K,
): Omit<T, K> => {
  const copia = { ...objeto };
  delete (copia as Partial<T>)[chave];
  return copia;
};

/** Caminhos pontilhados dos issues, na forma que a API devolve em `field`. */
const paths = (resultado: { success: false; error: { issues: { path: PropertyKey[] }[] } }) =>
  resultado.error.issues.map((issue) => issue.path.join("."));

describe("exemplos do documento validam contra o schema oficial", () => {
  test("avaliacao completa passa", () => {
    expect(criarAvaliacaoSchema.safeParse(COMPLETO).success).toBe(true);
  });

  test("avaliacao parcial passa — parcial e a norma, nao a excecao", () => {
    expect(criarAvaliacaoSchema.safeParse(PARCIAL).success).toBe(true);
  });
});

/**
 * ⚠️ CONTRATO ENTRE TIMES, nao detalhe interno.
 *
 * O front usa o `name` de cada input **identico** ao path do issue, sem tabela
 * de traducao (`docs/e5-v2-implementation-spec.md` secao 6). Se o Zod parar de
 * prefixar o path relativo do `superRefine` com o caminho de aninhamento, o
 * mapeamento de erro por campo, o foco no primeiro erro e o resumo de erros
 * quebram todos de uma vez — silenciosamente. Por isso as strings estao escritas
 * literalmente aqui, e nao derivadas.
 */
describe("paths literais dos issues", () => {
  test("carga sem tempo aponta para o tempo do exercicio certo", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      velocidade: {
        squatJump: { cargaKg: 20, tempoSegundos: null },
        agachamento: { cargaKg: null, tempoSegundos: null },
      },
    });

    expect(resultado.success).toBe(false);
    expect(paths(resultado as never)).toEqual([
      "velocidade.squatJump.tempoSegundos",
    ]);
  });

  test("tempo sem carga aponta para a carga do exercicio certo", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      velocidade: {
        squatJump: { cargaKg: null, tempoSegundos: null },
        agachamento: { cargaKg: null, tempoSegundos: 1.91 },
      },
    });

    expect(resultado.success).toBe(false);
    expect(paths(resultado as never)).toEqual([
      "velocidade.agachamento.cargaKg",
    ]);
  });

  test("os dois exercicios incompletos rendem um issue cada", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      velocidade: {
        squatJump: { cargaKg: 20, tempoSegundos: null },
        agachamento: { cargaKg: null, tempoSegundos: 1.91 },
      },
    });

    expect(resultado.success).toBe(false);
    expect(paths(resultado as never).sort()).toEqual([
      "velocidade.agachamento.cargaKg",
      "velocidade.squatJump.tempoSegundos",
    ]);
  });

  test("campos de amplitude e salto usam o caminho aninhado do bloco", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      amplitude: { ...COMPLETO.amplitude, slb: { direito: -1, esquerdo: 31.9 } },
      saltos: { ...COMPLETO.saltos, salto3: -5 },
    });

    expect(resultado.success).toBe(false);
    expect(paths(resultado as never).sort()).toEqual([
      "amplitude.slb.direito",
      "saltos.salto3",
    ]);
  });
});

describe("regra de consistencia carga <-> tempo", () => {
  test("os dois preenchidos passa", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      velocidade: {
        squatJump: { cargaKg: 20, tempoSegundos: 1.43 },
        agachamento: { cargaKg: null, tempoSegundos: null },
      },
    });

    expect(resultado.success).toBe(true);
  });

  test("os dois null passa — exercicio simplesmente nao foi medido", () => {
    expect(criarAvaliacaoSchema.safeParse(PARCIAL).success).toBe(true);
  });
});

describe("zero e negativo", () => {
  test("carga zero e aceita — peso corporal e medicao legitima", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      velocidade: {
        squatJump: { cargaKg: 0, tempoSegundos: 1.43 },
        agachamento: { cargaKg: null, tempoSegundos: null },
      },
    });

    expect(resultado.success).toBe(true);
  });

  test("tempo zero e rejeitado — seria divisao por zero na velocidade", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      velocidade: {
        squatJump: { cargaKg: 20, tempoSegundos: 0 },
        agachamento: { cargaKg: null, tempoSegundos: null },
      },
    });

    expect(resultado.success).toBe(false);
    expect(paths(resultado as never)).toContain(
      "velocidade.squatJump.tempoSegundos",
    );
  });

  test("zero em medida e aceito — medido e deu zero", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      saltos: { ...COMPLETO.saltos, cmj: 0 },
    });

    expect(resultado.success).toBe(true);
  });

  test("negativo e rejeitado em qualquer medida", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      saltos: { ...COMPLETO.saltos, cmj: -1 },
    });

    expect(resultado.success).toBe(false);
  });
});

/**
 * Chave ausente e diferente de chave `null`. O contrato exige todas presentes
 * justamente pra que "nao mandei" nunca possa ser lido como "apaguei".
 */
describe("todas as chaves sao obrigatorias", () => {
  test("bloco inteiro faltando e rejeitado", () => {
    expect(
      criarAvaliacaoSchema.safeParse(sem(COMPLETO, "velocidade")).success,
    ).toBe(false);
  });

  test("uma chave faltando dentro do bloco e rejeitada", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      saltos: sem(COMPLETO.saltos, "salto5"),
    });

    expect(resultado.success).toBe(false);
    expect(paths(resultado as never)).toContain("saltos.salto5");
  });

  test("undefined nao substitui null", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      saltos: { ...COMPLETO.saltos, cmj: undefined },
    });

    expect(resultado.success).toBe(false);
  });
});

describe("observacoes", () => {
  test("e opcional", () => {
    expect(criarAvaliacaoSchema.safeParse(PARCIAL).success).toBe(true);
  });

  test("chega aparada", () => {
    const resultado = criarAvaliacaoSchema.safeParse({
      ...COMPLETO,
      observacoes: "  com espaco  ",
    });

    expect(resultado.success && resultado.data.observacoes).toBe("com espaco");
  });
});

describe("PATCH substitui bloco inteiro", () => {
  test("aceita um bloco sozinho", () => {
    const resultado = atualizarAvaliacaoSchema.safeParse({
      amplitude: COMPLETO.amplitude,
    });

    expect(resultado.success).toBe(true);
  });

  test("aceita payload vazio — nada muda", () => {
    expect(atualizarAvaliacaoSchema.safeParse({}).success).toBe(true);
  });

  test("bloco enviado continua exigindo todas as chaves", () => {
    expect(
      atualizarAvaliacaoSchema.safeParse({
        saltos: sem(COMPLETO.saltos, "salto5"),
      }).success,
    ).toBe(false);
  });

  test("a regra carga <-> tempo vale igual no PATCH", () => {
    const resultado = atualizarAvaliacaoSchema.safeParse({
      velocidade: {
        squatJump: { cargaKg: 20, tempoSegundos: null },
        agachamento: { cargaKg: null, tempoSegundos: null },
      },
    });

    expect(resultado.success).toBe(false);
    expect(paths(resultado as never)).toEqual([
      "velocidade.squatJump.tempoSegundos",
    ]);
  });

  test("observacoes null limpa, ausente mantem", () => {
    // Sem o `null` nao existiria payload capaz de apagar uma observacao (D3).
    const limpa = atualizarAvaliacaoSchema.safeParse({ observacoes: null });
    const mantem = atualizarAvaliacaoSchema.safeParse({});

    expect(limpa.success && limpa.data.observacoes).toBeNull();
    expect(mantem.success && mantem.data.observacoes).toBeUndefined();
  });

  test("alunoId nao e aceito — avaliacao nao muda de aluno", () => {
    const resultado = atualizarAvaliacaoSchema.safeParse({
      alunoId: "8b4dfdff-ba28-4085-a11d-43062d642925",
    });

    expect(resultado.success && "alunoId" in resultado.data).toBe(false);
  });
});
