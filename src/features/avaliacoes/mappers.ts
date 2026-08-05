import type { ZodError } from "zod";
import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { paraNumero } from "@/features/avaliacoes/decimal";
import { NOMES_CAMPOS_NUMERICOS, type ErrosAvaliacaoV2, type ValoresAvaliacaoV2 } from "@/features/avaliacoes/tipos";

const MSG_FORMATO = "Use apenas números, com vírgula ou ponto para decimais.";
const txt = (fd: FormData, name: string) => String(fd.get(name) ?? "");

export function formDataParaValoresV2(fd: FormData): ValoresAvaliacaoV2 {
  return { dataAvaliacao: txt(fd, "dataAvaliacao"), observacoes: txt(fd, "observacoes"), campos: Object.fromEntries(NOMES_CAMPOS_NUMERICOS.map((nome) => [nome, txt(fd, nome)])) };
}

export function formDataParaDTO(fd: FormData, alunoId: string): { dto: Record<string, unknown>; errosLexicais: ErrosAvaliacaoV2 } {
  const errosLexicais: ErrosAvaliacaoV2 = {};
  const num = (name: string): number | null | undefined => {
    const resultado = paraNumero(txt(fd, name));
    if (!resultado.ok) { errosLexicais[name] = MSG_FORMATO; return undefined; }
    return resultado.valor;
  };
  const par = (base: string) => ({ direito: num(`${base}.direito`) ?? null, esquerdo: num(`${base}.esquerdo`) ?? null });
  const exercicio = (base: string) => ({ cargaKg: num(`${base}.cargaKg`) ?? null, tempoSegundos: num(`${base}.tempoSegundos`) ?? null });
  const observacoes = txt(fd, "observacoes").trim();
  return { dto: { alunoId, dataAvaliacao: txt(fd, "dataAvaliacao"), amplitude: { tornozelo: par("amplitude.tornozelo"), quadril: par("amplitude.quadril"), isquiotibiais: par("amplitude.isquiotibiais"), slb: par("amplitude.slb") }, saltos: { cmj: num("saltos.cmj") ?? null, salto2: num("saltos.salto2") ?? null, salto3: num("saltos.salto3") ?? null, salto4: num("saltos.salto4") ?? null, salto5: num("saltos.salto5") ?? null }, velocidade: { squatJump: exercicio("velocidade.squatJump"), agachamento: exercicio("velocidade.agachamento") }, ...(observacoes ? { observacoes } : {}) }, errosLexicais };
}

export type ReferenciaAnteriorV2 = { dataAvaliacao: string; amplitude: { tornozelo: { direito: number | null; esquerdo: number | null }; quadril: { direito: number | null; esquerdo: number | null }; isquiotibiais: { direito: number | null; esquerdo: number | null }; slb: { direito: number | null; esquerdo: number | null } }; cmj: number | null };

export function referenciaV2DeAvaliacaoV1(avaliacao: Pick<AvaliacaoCompleta, "dataAvaliacao" | "medidas">): ReferenciaAnteriorV2 {
  const m = avaliacao.medidas;
  return { dataAvaliacao: avaliacao.dataAvaliacao, amplitude: { tornozelo: { direito: m.mobilidadeTornozelo.direito, esquerdo: m.mobilidadeTornozelo.esquerdo }, quadril: { direito: m.mobilidadeQuadril.direito, esquerdo: m.mobilidadeQuadril.esquerdo }, isquiotibiais: { direito: m.amplitudeIsquiotibiais.direito, esquerdo: m.amplitudeIsquiotibiais.esquerdo }, slb: { direito: m.slb.direito, esquerdo: m.slb.esquerdo } }, cmj: m.cmj.valor };
}

type IssueSimples = { field: string; message: string };
export function issuesParaErros(issues: IssueSimples[] | undefined): { errosPorCampo: ErrosAvaliacaoV2; mensagemGeral: string | null } {
  const errosPorCampo: ErrosAvaliacaoV2 = {}; const geral: string[] = [];
  const conhecidos = new Set<string>(["dataAvaliacao", "observacoes", ...NOMES_CAMPOS_NUMERICOS]);
  for (const issue of issues ?? []) {
    if (conhecidos.has(issue.field)) errosPorCampo[issue.field] = issue.message;
    else geral.push(issue.message);
  }
  return { errosPorCampo, mensagemGeral: geral.length ? geral.join(" ") : null };
}
export function zodErrorParaIssues(erro: ZodError): IssueSimples[] { return erro.issues.map((issue) => ({ field: issue.path.join("."), message: issue.path.join(".") === "dataAvaliacao" ? "Informe uma data válida." : issue.message })); }
