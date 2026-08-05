import type { ValoresAvaliacaoV2 } from "./tipos";

export const VERSAO_RASCUNHO = 2;
export type Rascunho = { versao: number; alunoId: string; salvoEm: string; valores: ValoresAvaliacaoV2 };
export const chaveRascunho = (alunoId: string) => `gym-app:rascunho-avaliacao:v${VERSAO_RASCUNHO}:${alunoId}`;
export function lerRascunho(alunoId: string): Rascunho | null { try { const bruto = localStorage.getItem(chaveRascunho(alunoId)); if (!bruto) return null; const valor: unknown = JSON.parse(bruto); if (!valor || typeof valor !== "object") return null; const r = valor as Partial<Rascunho>; return r.versao === VERSAO_RASCUNHO && r.alunoId === alunoId && r.valores ? r as Rascunho : null; } catch { return null; } }
export function gravarRascunho(alunoId: string, valores: ValoresAvaliacaoV2): void { try { localStorage.setItem(chaveRascunho(alunoId), JSON.stringify({ versao: VERSAO_RASCUNHO, alunoId, salvoEm: new Date().toISOString(), valores } satisfies Rascunho)); } catch {} }
export function limparRascunho(alunoId: string): void { try { localStorage.removeItem(chaveRascunho(alunoId)); } catch {} }
