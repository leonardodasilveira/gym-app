export const NOMES_CAMPOS_NUMERICOS = [
  "amplitude.tornozelo.direito", "amplitude.tornozelo.esquerdo",
  "amplitude.quadril.direito", "amplitude.quadril.esquerdo",
  "amplitude.isquiotibiais.direito", "amplitude.isquiotibiais.esquerdo",
  "amplitude.slb.direito", "amplitude.slb.esquerdo",
  "saltos.cmj", "saltos.salto2", "saltos.salto3", "saltos.salto4", "saltos.salto5",
  "velocidade.squatJump.cargaKg", "velocidade.squatJump.tempoSegundos",
  "velocidade.agachamento.cargaKg", "velocidade.agachamento.tempoSegundos",
] as const;

export type ValoresAvaliacaoV2 = {
  dataAvaliacao: string;
  observacoes: string;
  campos: Record<string, string>;
};

export type ErrosAvaliacaoV2 = Record<string, string>;

export type EstadoAvaliacaoV2 =
  | { status: "inicial" }
  | { status: "sucesso"; id: string }
  | { status: "erro"; mensagem: string | null; errosPorCampo: ErrosAvaliacaoV2; valores: ValoresAvaliacaoV2; tentativa: number };
