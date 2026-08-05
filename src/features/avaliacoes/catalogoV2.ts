import { medidaPorChave } from "@/lib/medidas";

export const CAMPOS_AMPLITUDE = [
  { chaveDto: "tornozelo", ...medidaPorChave("mobilidadeTornozelo") },
  { chaveDto: "quadril", ...medidaPorChave("mobilidadeQuadril") },
  { chaveDto: "isquiotibiais", ...medidaPorChave("amplitudeIsquiotibiais") },
  { chaveDto: "slb", ...medidaPorChave("slb") },
] as const;

export const CAMPO_CMJ = { chaveDto: "cmj", ...medidaPorChave("cmj") } as const;

/** Slots provisórios: nome e unidade continuam bloqueados por B6. */
export const SALTOS_PROVISORIOS = [
  { chaveDto: "salto2", rotulo: "Resultado de salto 2", provisorio: true },
  { chaveDto: "salto3", rotulo: "Resultado de salto 3", provisorio: true },
  { chaveDto: "salto4", rotulo: "Resultado de salto 4", provisorio: true },
  { chaveDto: "salto5", rotulo: "Resultado de salto 5", provisorio: true },
] as const;

export const EXERCICIOS_VELOCIDADE = [
  { chaveDto: "squatJump", rotulo: "Squat Jump" },
  { chaveDto: "agachamento", rotulo: "Agachamento" },
] as const;
