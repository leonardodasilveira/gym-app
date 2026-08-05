import { describe, expect, test } from "vitest";

import {
  formatarData,
  linhasParaAmplitude,
  linhasParaMedidasDetalhadas,
  linhasParaSaltos,
  linhasParaVelocidade,
  medidasParaLinhas,
  paraData,
  serializarAvaliacao,
  siglaDaMedida,
  velocidadeParaLinhas,
  type AvaliacaoResponse,
  type LinhaMedida,
} from "@/lib/avaliacoes";
import { MEDIDAS } from "@/lib/medidas";
import type { AmplitudeDTO, SaltosDTO, VelocidadeDTO } from "@/lib/schemas";

const bilateral = (direito: number | null, esquerdo: number | null) =>
  ({ direito, esquerdo }) as const;

const amplitude = (parcial: Partial<AmplitudeDTO> = {}): AmplitudeDTO => ({
  tornozelo: bilateral(11.5, 12.1),
  quadril: bilateral(18.4, 17.8),
  isquiotibiais: bilateral(21, 20.7),
  slb: bilateral(32.5, 31.9),
  ...parcial,
});

const saltos = (parcial: Partial<SaltosDTO> = {}): SaltosDTO => ({
  cmj: 42.8,
  salto2: 38.1,
  salto3: 35,
  salto4: 30.2,
  salto5: 28.9,
  ...parcial,
});

const velocidade = (parcial: Partial<VelocidadeDTO> = {}): VelocidadeDTO => ({
  squatJump: { cargaKg: 20, tempoSegundos: 1.43 },
  agachamento: { cargaKg: 60, tempoSegundos: 1.91 },
  ...parcial,
});

describe("conversao entre os blocos do DTO e a tabela Medida", () => {
  test("gera exatamente uma linha por medida do catalogo", () => {
    const linhas = medidasParaLinhas(amplitude(), saltos());

    expect(linhas).toHaveLength(MEDIDAS.length);
    expect(linhas.map((l) => l.codigo).sort()).toEqual(
      MEDIDAS.map((m) => m.codigo).sort(),
    );
  });

  test("bilateral usa direito/esquerdo e salto usa valor", () => {
    const linhas = medidasParaLinhas(amplitude(), saltos());
    const tornozelo = linhas.find((l) => l.codigo === "MOBILIDADE_TORNOZELO")!;
    const cmj = linhas.find((l) => l.codigo === "CMJ")!;

    expect(tornozelo).toMatchObject({ direito: 11.5, esquerdo: 12.1, valor: null });
    expect(cmj).toMatchObject({ direito: null, esquerdo: null, valor: 42.8 });
  });

  test("ida e volta preserva os valores dos dois blocos", () => {
    const linhas = medidasParaLinhas(amplitude(), saltos());

    expect(linhasParaAmplitude(linhas)).toEqual(amplitude());
    expect(linhasParaSaltos(linhas)).toEqual(saltos());
  });

  /**
   * A unidade e propriedade do catalogo, nao do payload: o v2 nao transporta
   * unidade nenhuma. Este teste fixa que a gravacao busca no lugar certo.
   */
  test("a unidade vem do catalogo, e e null nos saltos sem unidade confirmada", () => {
    const linhas = medidasParaLinhas(amplitude(), saltos());
    const porCodigo = new Map(linhas.map((l) => [l.codigo, l]));

    expect(porCodigo.get("MOBILIDADE_TORNOZELO")!.unidade).toBe("cm");
    expect(porCodigo.get("CMJ")!.unidade).toBe("cm");

    // Bloqueio B6: ninguem confirmou se estes sao cm, % ou adimensionais.
    // Gravar "cm" aqui seria mentir no banco.
    for (const codigo of ["SALTO_2", "SALTO_3", "SALTO_4", "SALTO_5"]) {
      expect(porCodigo.get(codigo)!.unidade).toBeNull();
    }
  });
});

/**
 * A regra mais sensivel do produto. A planilha antiga usa `0` querendo dizer
 * "nao medido" — tem avaliacao real com CMJ = 0 (docs/planilha-atual.md:139-141)
 * — e o app existe em parte pra acabar com isso. Qualquer conversao que
 * confunda os dois estraga toda media do historico.
 */
describe("null e zero sao coisas diferentes", () => {
  test("zero medido sobrevive a ida e volta como zero", () => {
    const linhas = medidasParaLinhas(amplitude(), saltos({ cmj: 0 }));
    const voltou = linhasParaSaltos(linhas);

    expect(voltou.cmj).toBe(0);
    expect(voltou.cmj).not.toBeNull();
  });

  test("nao medido continua null e nunca vira zero", () => {
    const linhas = medidasParaLinhas(
      amplitude({ slb: bilateral(null, null) }),
      saltos({ cmj: null }),
    );

    expect(linhasParaSaltos(linhas).cmj).toBeNull();
    expect(linhasParaAmplitude(linhas).slb).toEqual({
      direito: null,
      esquerdo: null,
    });
  });

  test("um lado medido e o outro nao convivem na mesma medida", () => {
    const linhas = medidasParaLinhas(
      amplitude({ slb: bilateral(32.5, null) }),
      saltos(),
    );
    const voltou = linhasParaAmplitude(linhas);

    expect(voltou.slb.direito).toBe(32.5);
    expect(voltou.slb.esquerdo).toBeNull();
  });

  test("medida ausente no banco vira null, nao zero", () => {
    // Avaliacao antiga, gravada antes de a medida existir no catalogo.
    const soCmj: LinhaMedida[] = [
      { codigo: "CMJ", unidade: "cm", direito: null, esquerdo: null, valor: 42.8 },
    ];

    expect(linhasParaSaltos(soCmj).cmj).toBe(42.8);
    expect(linhasParaSaltos(soCmj).salto2).toBeNull();
    expect(linhasParaAmplitude(soCmj).tornozelo.direito).toBeNull();
    expect(linhasParaAmplitude(soCmj).quadril.esquerdo).toBeNull();
  });
});

describe("bloco de velocidade", () => {
  test("gera uma linha por exercicio do catalogo", () => {
    const linhas = velocidadeParaLinhas(velocidade());

    expect(linhas.map((l) => l.codigo)).toEqual(["SQUAT_JUMP", "AGACHAMENTO"]);
  });

  test("ida e volta preserva carga e tempo", () => {
    expect(linhasParaVelocidade(velocidadeParaLinhas(velocidade()))).toEqual(
      velocidade(),
    );
  });

  /**
   * Exercicio nao medido continua existindo como chave, com os dois valores
   * `null` — mesma regra de `Medida`. Omitir a linha reabriria a ambiguidade
   * entre "nao medido" e "nao existe neste modelo".
   */
  test("exercicio nao medido vira linha com os dois valores null", () => {
    const linhas = velocidadeParaLinhas(
      velocidade({ agachamento: { cargaKg: null, tempoSegundos: null } }),
    );

    expect(linhas).toHaveLength(2);
    expect(linhas.find((l) => l.codigo === "AGACHAMENTO")).toMatchObject({
      cargaKg: null,
      tempoSegundos: null,
    });
  });

  test("carga zero e dado real e nao se confunde com nao medido", () => {
    // Peso corporal: Squat Jump sem carga externa (proposta secao 6.3).
    const linhas = velocidadeParaLinhas(
      velocidade({ squatJump: { cargaKg: 0, tempoSegundos: 1.2 } }),
    );
    const voltou = linhasParaVelocidade(linhas);

    expect(voltou.squatJump.cargaKg).toBe(0);
    expect(voltou.squatJump.cargaKg).not.toBeNull();
  });

  test("exercicio ausente no banco vira chave com null", () => {
    const voltou = linhasParaVelocidade([
      { codigo: "SQUAT_JUMP", cargaKg: 20, tempoSegundos: 1.43 },
    ]);

    expect(voltou.squatJump.cargaKg).toBe(20);
    expect(voltou.agachamento).toEqual({ cargaKg: null, tempoSegundos: null });
  });
});

describe("formato achatado do relatorio", () => {
  const detalhadas = () =>
    linhasParaMedidasDetalhadas(medidasParaLinhas(amplitude(), saltos()));

  test("bilateral rende dois valores com a sigla da planilha", () => {
    const slb = detalhadas().find((m) => m.codigo === "SLB")!;

    expect(slb.valores.map((v) => v.sigla)).toEqual(["SLB DIR", "SLB ESQ"]);
    expect(slb.valores.map((v) => v.valor)).toEqual([32.5, 31.9]);
  });

  test("medida simples rende um valor sem lado", () => {
    const cmj = detalhadas().find((m) => m.codigo === "CMJ")!;

    expect(cmj.valores).toHaveLength(1);
    expect(cmj.valores[0]).toMatchObject({ sigla: "CMJ", lado: null, valor: 42.8 });
  });

  /**
   * O relatorio precisa saber a que bloco cada medida pertence pra agrupar
   * Amplitude e Salto em tabelas diferentes (proposta secao 9.2).
   */
  test("cada medida carrega o bloco a que pertence", () => {
    const porCodigo = new Map(detalhadas().map((m) => [m.codigo, m]));

    expect(porCodigo.get("MOBILIDADE_TORNOZELO")!.bloco).toBe("amplitude");
    expect(porCodigo.get("CMJ")!.bloco).toBe("salto");
    expect(porCodigo.get("SALTO_5")!.bloco).toBe("salto");
  });

  test("salto sem unidade confirmada chega ao relatorio como null", () => {
    // Quem renderiza precisa imprimir o numero sem sufixo, nunca chutar "cm".
    const salto2 = detalhadas().find((m) => m.codigo === "SALTO_2")!;

    expect(salto2.unidade).toBeNull();
  });

  test("codigo fora do catalogo cai de volta no proprio codigo", () => {
    expect(siglaDaMedida("SLB", "esquerdo")).toBe("SLB ESQ");
    expect(siglaDaMedida("NAO_EXISTE")).toBe("NAO_EXISTE");
  });
});

describe("datas atravessam sem fuso horario", () => {
  test("ida e volta devolve a mesma data civil", () => {
    expect(formatarData(paraData("2026-04-30"))).toBe("2026-04-30");
  });

  test("virada de ano nao anda um dia", () => {
    expect(formatarData(paraData("2026-01-01"))).toBe("2026-01-01");
    expect(formatarData(paraData("2025-12-31"))).toBe("2025-12-31");
  });
});

describe("serializarAvaliacao", () => {
  const respostaDeExemplo = (): AvaliacaoResponse =>
    serializarAvaliacao({
      id: "aval-1",
      alunoId: "aluno-1",
      dataAvaliacao: paraData("2026-04-30"),
      observacoes: null,
      criadoEm: new Date("2026-04-30T13:00:00.000Z"),
      medidas: medidasParaLinhas(amplitude(), saltos()),
      velocidades: velocidadeParaLinhas(velocidade()),
    });

  test("devolve os mesmos tres blocos do DTO de entrada, mais id e criadoEm", () => {
    const resposta = respostaDeExemplo();

    expect(resposta.dataAvaliacao).toBe("2026-04-30");
    expect(resposta.amplitude).toEqual(amplitude());
    expect(resposta.saltos).toEqual(saltos());
    expect(resposta.velocidade).toEqual(velocidade());
  });

  /**
   * A simetria entrada/saida e o que permite o front usar a resposta do GET pra
   * preencher o formulario de edicao sem tabela de traducao.
   */
  test("a saida tambem nao carrega unidade nenhuma", () => {
    const resposta = respostaDeExemplo();
    const serializado = JSON.stringify(resposta);

    expect(serializado).not.toContain("unidade");
  });

  test("nenhum Date sobrevive ate a resposta", () => {
    // E o que faz `AvaliacaoResponse` valer igual antes e depois do JSON: se um
    // Date escapasse, o tipo diria `Date` e o front receberia string.
    const resposta = respostaDeExemplo();

    for (const valor of Object.values(resposta)) {
      expect(valor).not.toBeInstanceOf(Date);
    }
    expect(resposta.dataAvaliacao).toBe("2026-04-30");
    expect(resposta.criadoEm).toBe("2026-04-30T13:00:00.000Z");
  });

  test("a resposta atravessa o JSON sem perder nada", () => {
    const resposta = respostaDeExemplo();

    expect(JSON.parse(JSON.stringify(resposta))).toEqual(resposta);
  });
});
