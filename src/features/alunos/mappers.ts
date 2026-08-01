import type { ZodError } from "zod";

import type { CampoAluno, ValoresAluno } from "@/features/alunos/tipos";

const CAMPOS_ALUNO: readonly CampoAluno[] = ["nome", "dataNascimento"];

function ehCampoAluno(valor: string): valor is CampoAluno {
  return (CAMPOS_ALUNO as readonly string[]).includes(valor);
}

/**
 * FormData -> payload pronto pro schema. Duas conversoes obrigatorias,
 * medidas empiricamente (e4-implementation-spec.md 6.3):
 * - data vazia chega como "" no FormData; "" e null dao 422 no schema —
 *   precisa virar chave OMITIDA pra contar como ausente.
 * - nome sempre vai como string, mesmo vazia: omitir a chave produz a
 *   mensagem tecnica do Zod ("expected string, received undefined") em vez
 *   da mensagem do schema ("Nome precisa de pelo menos 2 letras").
 */
export function formDataParaAluno(fd: FormData): {
  nome: string;
  dataNascimento?: string;
} {
  const nome = String(fd.get("nome") ?? "");
  const dataNascimento = String(fd.get("dataNascimento") ?? "").trim();
  return { nome, ...(dataNascimento ? { dataNascimento } : {}) };
}

/** Valores brutos do FormData, pra ecoar no estado apos erro (spec 5.4). */
export function formDataParaValores(fd: FormData): ValoresAluno {
  return {
    nome: String(fd.get("nome") ?? ""),
    dataNascimento: String(fd.get("dataNascimento") ?? ""),
  };
}

type IssueSimples = { field: string; message: string };

/**
 * issues (servidor ou cliente, ja no formato {field,message}) -> erros por
 * campo + mensagem geral. Um `field` que nao e um CampoAluno conhecido vira
 * mensagem geral — nunca e descartado silenciosamente (spec 5.5).
 */
export function issuesParaErros(issues: IssueSimples[] | undefined): {
  errosPorCampo: Partial<Record<CampoAluno, string>>;
  mensagemGeral: string | null;
} {
  const errosPorCampo: Partial<Record<CampoAluno, string>> = {};
  const geral: string[] = [];

  for (const issue of issues ?? []) {
    if (ehCampoAluno(issue.field)) {
      errosPorCampo[issue.field] = issue.message;
    } else {
      geral.push(issue.message);
    }
  }

  return { errosPorCampo, mensagemGeral: geral.length > 0 ? geral.join(" ") : null };
}

const MENSAGEM_DATA_INVALIDA = "Informe uma data válida.";

/**
 * ZodError da validacao no cliente -> mesmo formato de issue do servidor.
 * A mensagem tecnica do schema ("dataNascimento no formato AAAA-MM-DD") vira
 * a mensagem amigavel aqui; a de `nome` passa direto, pois ja e a mesma dos
 * dois lados (spec 6.6).
 */
export function zodErrorParaIssues(erro: ZodError): IssueSimples[] {
  return erro.issues.map((issue) => {
    const field = issue.path.join(".");
    return {
      field,
      message: field === "dataNascimento" ? MENSAGEM_DATA_INVALIDA : issue.message,
    };
  });
}
