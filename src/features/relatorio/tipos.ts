import type { AjusteCurva, PontoCurva, calcularScore } from "@/lib/calculos";
import type { MedidaDetalhada } from "@/lib/avaliacoes";
import type { MedidasDTO } from "@/lib/schemas";
import type { TextosRelatorio } from "@/lib/textos";

/**
 * Espelha a resposta de GET /avaliacoes/:id/relatorio
 * (src/app/api/avaliacoes/[id]/relatorio/route.ts). As partes derivaveis vem
 * de import type dos modulos do backend — se o formato mudar, o typecheck
 * quebra aqui em vez de a tela quebrar em runtime (frontend-plan.md, R3).
 * `PontoCmj`/`ResumoCmjRelatorio`/o envelope de topo nao tem tipo exportado
 * pelo backend (route.ts:95,116) — declarados a mao.
 */

export type PontoCmj = {
  data: string;
  valor: number;
};

export type ResumoCmjRelatorio = {
  inicial: PontoCmj;
  pico: PontoCmj;
  atual: PontoCmj;
  variacaoVsInicial: number;
  variacaoVsPico: number;
};

export type RelatorioResponse = {
  aluno: {
    id: string;
    nome: string;
  };
  avaliacao: {
    id: string;
    dataAvaliacao: string;
    observacoes: string | null;
  };
  periodo: {
    de: string;
    ate: string;
    totalAvaliacoes: number;
  };
  medidas: MedidasDTO;
  medidasDetalhadas: MedidaDetalhada[];
  curva: {
    pontos: PontoCurva[];
    cargaMaximaKg: number | null;
    ajuste: AjusteCurva | null;
    perfil: string;
  };
  historicoCmj: PontoCmj[];
  resumoCmj: ResumoCmjRelatorio | null;
  score: ReturnType<typeof calcularScore>;
  textos: TextosRelatorio;
  provisorio: {
    curva: string;
    score: string;
    textos: string;
  };
};
