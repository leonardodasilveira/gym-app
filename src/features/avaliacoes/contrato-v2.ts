// PROVISÓRIO. Será removido quando o backend publicar o contrato v2 oficial.
import { z } from "zod";

const valorMedida = z.number().min(0).nullable();
const parBilateral = z.object({ direito: valorMedida, esquerdo: valorMedida });
const exercicioVelocidadeSchema = z
  .object({ cargaKg: z.number().min(0).nullable(), tempoSegundos: z.number().positive().nullable() })
  .superRefine((valor, ctx) => {
    if (valor.cargaKg !== null && valor.tempoSegundos === null) {
      ctx.addIssue({ code: "custom", path: ["tempoSegundos"], message: "Informe o tempo junto com a carga." });
    }
    if (valor.tempoSegundos !== null && valor.cargaKg === null) {
      ctx.addIssue({ code: "custom", path: ["cargaKg"], message: "Informe a carga junto com o tempo." });
    }
  });

export const schemaAvaliacaoV2Provisorio = z.object({
  alunoId: z.uuid("alunoId precisa ser um UUID"),
  dataAvaliacao: z.iso.date("dataAvaliacao no formato AAAA-MM-DD"),
  amplitude: z.object({ tornozelo: parBilateral, quadril: parBilateral, isquiotibiais: parBilateral, slb: parBilateral }),
  saltos: z.object({ cmj: valorMedida, salto2: valorMedida, salto3: valorMedida, salto4: valorMedida, salto5: valorMedida }),
  velocidade: z.object({ squatJump: exercicioVelocidadeSchema, agachamento: exercicioVelocidadeSchema }),
  observacoes: z.string().trim().optional(),
});

export type CriarAvaliacaoV2DTO = z.infer<typeof schemaAvaliacaoV2Provisorio>;
