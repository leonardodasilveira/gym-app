import { describe, expect, it } from "vitest";

import {
  montarCompartilhamento,
  urlEmail,
  urlWhatsApp,
} from "@/features/relatorio/compartilhamento";
import type { RelatorioResponse } from "@/features/relatorio/tipos";

function relatorioTeste(
  opcoes: {
    nome?: string;
    semanas?: number | null;
    totalAvaliacoes?: number;
    semCmj?: boolean;
  } = {},
): RelatorioResponse {
  return {
    aluno: { id: "aluno-1", nome: opcoes.nome ?? "Ana Prado" },
    avaliacao: {
      id: "avaliacao-1",
      dataAvaliacao: "2026-04-30",
      observacoes: null,
    },
    periodo: {
      de: "2026-03-19",
      ate: "2026-04-30",
      totalAvaliacoes: opcoes.totalAvaliacoes ?? 2,
      semanas: opcoes.semanas === undefined ? 8 : opcoes.semanas,
    },
    resumoCmj: opcoes.semCmj
      ? null
      : {
          inicial: { data: "2026-03-19", valor: 45.01 },
          pico: { data: "2026-03-19", valor: 45.95 },
          atual: { data: "2026-04-30", valor: 43.53 },
          variacaoVsInicial: -1.48,
          variacaoVsPico: -2.42,
        },
    textos: {
      melhorias: ["Lorem ipsum"],
      pontosAtencao: ["Lorem ipsum"],
      recomendacoes: [],
      conclusao: "Lorem ipsum",
    },
  } as unknown as RelatorioResponse;
}

describe("montarCompartilhamento", () => {
  it("inclui nome, data, periodo e URL da visao", () => {
    const conteudo = montarCompartilhamento(
      relatorioTeste(),
      "http://localhost:3000/avaliacoes/avaliacao-1/relatorio?semanas=8",
    );

    expect(conteudo.mensagem).toContain("Ana Prado");
    expect(conteudo.mensagem).toContain("30/04/2026");
    expect(conteudo.mensagem).toContain("8 semanas");
    expect(conteudo.mensagem).toContain("?semanas=8");
  });

  it("rotula o historico completo", () => {
    const conteudo = montarCompartilhamento(
      relatorioTeste({ semanas: null }),
      "https://exemplo.test/avaliacoes/avaliacao-1/relatorio?semanas=todo",
    );

    expect(conteudo.mensagem).toContain("Histórico completo");
    expect(conteudo.mensagem).toContain("semanas=todo");
  });

  it("substitui todo o bloco quando nao ha CMJ", () => {
    const mensagem = montarCompartilhamento(
      relatorioTeste({ semCmj: true, totalAvaliacoes: 0 }),
      "https://exemplo.test/relatorio",
    ).mensagem;

    expect(mensagem).toContain("Sem CMJ registrado nesta janela.");
    expect(mensagem).not.toContain("Variação vs.");
    expect(mensagem).not.toContain("CMJ mais recente");
  });

  it("nunca inclui os textos provisorios", () => {
    const mensagem = montarCompartilhamento(
      relatorioTeste(),
      "https://exemplo.test/relatorio",
    ).mensagem;

    expect(mensagem).not.toMatch(/lorem|ipsum/i);
  });

  it("formata numeros em pt-BR e deltas com sinal", () => {
    const mensagem = montarCompartilhamento(
      relatorioTeste(),
      "https://exemplo.test/relatorio",
    ).mensagem;

    expect(mensagem).toContain("43,53 cm");
    expect(mensagem).toContain("-1,48 cm");
    expect(mensagem).toContain("-2,42 cm");
  });

  it("qualifica o CMJ como o mais recente do historico", () => {
    const mensagem = montarCompartilhamento(
      relatorioTeste(),
      "https://exemplo.test/relatorio",
    ).mensagem;

    expect(mensagem).toContain("CMJ mais recente do histórico");
    expect(mensagem).not.toContain("CMJ atual");
  });
});

describe("URLs de compartilhamento", () => {
  const conteudo = montarCompartilhamento(
    relatorioTeste({ nome: "João & Ana" }),
    "https://exemplo.test/relatorio?semanas=8&origem=teste",
  );

  it("codifica acentos para o WhatsApp", () => {
    const url = urlWhatsApp(conteudo);
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(url).toContain("Relat%C3%B3rio");
  });

  it("codifica quebras como %0A e espacos como %20", () => {
    const url = urlWhatsApp(conteudo);
    expect(url).toContain("%0A");
    expect(url).toContain("%20");
    expect(url).not.toContain("+");
  });

  it("codifica separadamente assunto e corpo do e-mail", () => {
    const url = urlEmail(conteudo);
    expect(url).toMatch(/^mailto:\?subject=.+&body=.+/);
    expect(url).toContain("Relat%C3%B3rio");
    expect(url).toContain("%0A");
  });

  it("nao deixa o e comercial do nome truncar a query", () => {
    const whatsapp = urlWhatsApp(conteudo);
    const email = urlEmail(conteudo);
    expect(whatsapp).toContain("Jo%C3%A3o%20%26%20Ana");
    expect(email).toContain("Jo%C3%A3o%20%26%20Ana");
    expect(decodeURIComponent(whatsapp.split("?text=")[1])).toContain(
      "João & Ana",
    );
  });
});
