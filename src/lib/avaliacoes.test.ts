import { describe, expect, test } from "vitest";

import {
  formatarData,
  linhasParaMedidas,
  linhasParaMedidasDetalhadas,
  medidasParaLinhas,
  paraData,
  serializarAvaliacao,
  siglaDaMedida,
  type AvaliacaoResponse,
  type LinhaMedida,
} from "@/lib/avaliacoes";
import { MEDIDAS } from "@/lib/medidas";
import type { MedidasDTO } from "@/lib/schemas";

const bilateral = (direito: number | null, esquerdo: number | null) =>
  ({ unidade: "cm", direito, esquerdo }) as const;

const medidas = (parcial: Partial<MedidasDTO> = {}): MedidasDTO => ({
  mobilidadeTornozelo: bilateral(11.5, 12.1),
  mobilidadeQuadril: bilateral(18.4, 17.8),
  amplitudeIsquiotibiais: bilateral(21, 20.7),
  slb: bilateral(32.5, 31.9),
  cmj: { unidade: "cm", valor: 42.8 },
  ...parcial,
});

describe("conversao entre o DTO e a tabela Medida", () => {
  test("gera exatamente uma linha por medida do catalogo", () => {
    const linhas = medidasParaLinhas(medidas());

    expect(linhas).toHaveLength(MEDIDAS.length);
    expect(linhas.map((l) => l.codigo)).toEqual(MEDIDAS.map((m) => m.codigo));
  });

  test("bilateral usa direito/esquerdo e simples usa valor", () => {
    const linhas = medidasParaLinhas(medidas());
    const tornozelo = linhas.find((l) => l.codigo === "MOBILIDADE_TORNOZELO")!;
    const cmj = linhas.find((l) => l.codigo === "CMJ")!;

    expect(tornozelo).toMatchObject({ direito: 11.5, esquerdo: 12.1, valor: null });
    expect(cmj).toMatchObject({ direito: null, esquerdo: null, valor: 42.8 });
  });

  test("ida e volta preserva os valores", () => {
    const original = medidas();

    expect(linhasParaMedidas(medidasParaLinhas(original))).toEqual(original);
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
    const comZero = medidas({ cmj: { unidade: "cm", valor: 0 } });
    const voltou = linhasParaMedidas(medidasParaLinhas(comZero));

    expect(voltou.cmj.valor).toBe(0);
    expect(voltou.cmj.valor).not.toBeNull();
  });

  test("nao medido continua null e nunca vira zero", () => {
    const semNada = medidas({
      cmj: { unidade: "cm", valor: null },
      slb: bilateral(null, null),
    });
    const voltou = linhasParaMedidas(medidasParaLinhas(semNada));

    expect(voltou.cmj.valor).toBeNull();
    expect(voltou.slb.direito).toBeNull();
    expect(voltou.slb.esquerdo).toBeNull();
  });

  test("um lado medido e o outro nao convivem na mesma medida", () => {
    const soDireito = medidas({ slb: bilateral(32.5, null) });
    const voltou = linhasParaMedidas(medidasParaLinhas(soDireito));

    expect(voltou.slb.direito).toBe(32.5);
    expect(voltou.slb.esquerdo).toBeNull();
  });

  test("medida ausente no banco vira null, nao zero", () => {
    // Avaliacao antiga, gravada antes de a medida existir no catalogo.
    const soCmj: LinhaMedida[] = [
      { codigo: "CMJ", unidade: "cm", direito: null, esquerdo: null, valor: 42.8 },
    ];
    const voltou = linhasParaMedidas(soCmj);

    expect(voltou.cmj.valor).toBe(42.8);
    expect(voltou.mobilidadeTornozelo.direito).toBeNull();
    expect(voltou.mobilidadeQuadril.esquerdo).toBeNull();
  });
});

describe("formato achatado do relatorio", () => {
  test("bilateral rende dois valores com a sigla da planilha", () => {
    const detalhadas = linhasParaMedidasDetalhadas(medidasParaLinhas(medidas()));
    const slb = detalhadas.find((m) => m.codigo === "SLB")!;

    expect(slb.valores.map((v) => v.sigla)).toEqual(["SLB DIR", "SLB ESQ"]);
    expect(slb.valores.map((v) => v.valor)).toEqual([32.5, 31.9]);
  });

  test("medida simples rende um valor sem lado", () => {
    const detalhadas = linhasParaMedidasDetalhadas(medidasParaLinhas(medidas()));
    const cmj = detalhadas.find((m) => m.codigo === "CMJ")!;

    expect(cmj.valores).toHaveLength(1);
    expect(cmj.valores[0]).toMatchObject({ sigla: "CMJ", lado: null, valor: 42.8 });
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
      medidas: medidasParaLinhas(medidas()),
      testes: [],
    });

  test("devolve o mesmo formato do DTO de entrada, mais id e criadoEm", () => {
    const resposta = serializarAvaliacao({
      id: "aval-1",
      alunoId: "aluno-1",
      dataAvaliacao: paraData("2026-04-30"),
      observacoes: "Boa evolucao.",
      criadoEm: new Date("2026-04-30T13:00:00.000Z"),
      medidas: medidasParaLinhas(medidas()),
      testes: [
        {
          codigo: "AGACHAMENTO",
          nome: "Agachamento",
          ordem: 0,
          tentativas: [
            {
              ordem: 1,
              repeticoes: 8,
              cargaValor: 60,
              cargaUnidade: "kg",
              tempoValor: 11.9,
              tempoUnidade: "s",
            },
          ],
        },
      ],
    });

    expect(resposta.dataAvaliacao).toBe("2026-04-30");
    expect(resposta.medidas.cmj.valor).toBe(42.8);
    expect(resposta.testes[0].tentativas[0]).toEqual({
      ordem: 1,
      repeticoes: 8,
      carga: { valor: 60, unidade: "kg" },
      tempo: { valor: 11.9, unidade: "s" },
    });
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
