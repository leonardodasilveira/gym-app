import type { CriarAvaliacaoDTO } from "@/lib/schemas";

export const avaliacaoV2Completa = {
  alunoId: "8b4dfdff-ba28-4085-a11d-43062d642925", dataAvaliacao: "2026-08-02",
  amplitude: { tornozelo: { direito: 11.5, esquerdo: 12.1 }, quadril: { direito: 18.4, esquerdo: 17.8 }, isquiotibiais: { direito: 21, esquerdo: 20.7 }, slb: { direito: 32.5, esquerdo: 31.9 } },
  saltos: { cmj: 42.8, salto2: 38.1, salto3: 35, salto4: 30.2, salto5: 28.9 },
  velocidade: { squatJump: { cargaKg: 20, tempoSegundos: 1.43 }, agachamento: { cargaKg: 60, tempoSegundos: 1.91 } },
  observacoes: "Boa evolução na mobilidade.",
} satisfies CriarAvaliacaoDTO;

export const avaliacaoV2Parcial = {
  alunoId: "8b4dfdff-ba28-4085-a11d-43062d642925", dataAvaliacao: "2026-08-02",
  amplitude: { tornozelo: { direito: 11.5, esquerdo: 12.1 }, quadril: { direito: null, esquerdo: null }, isquiotibiais: { direito: null, esquerdo: null }, slb: { direito: null, esquerdo: null } },
  saltos: { cmj: null, salto2: null, salto3: null, salto4: null, salto5: null },
  velocidade: { squatJump: { cargaKg: null, tempoSegundos: null }, agachamento: { cargaKg: null, tempoSegundos: null } },
} satisfies CriarAvaliacaoDTO;
