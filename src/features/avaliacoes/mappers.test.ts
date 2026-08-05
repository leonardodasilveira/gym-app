import { describe, expect, it } from "vitest";
import { formDataParaDTO } from "./mappers";

const ID = "8b4dfdff-ba28-4085-a11d-43062d642925";
describe("formDataParaDTO", () => {
  it("mantém todas as chaves e null nos 17 campos vazios", () => {
    const fd = new FormData(); fd.set("dataAvaliacao", "2026-08-02");
    const { dto, errosLexicais } = formDataParaDTO(fd, ID);
    expect(errosLexicais).toEqual({}); expect(JSON.stringify(dto)).not.toContain("unidade");
    expect(dto).toEqual({ alunoId: ID, dataAvaliacao: "2026-08-02", amplitude: { tornozelo: { direito: null, esquerdo: null }, quadril: { direito: null, esquerdo: null }, isquiotibiais: { direito: null, esquerdo: null }, slb: { direito: null, esquerdo: null } }, saltos: { cmj: null, salto2: null, salto3: null, salto4: null, salto5: null }, velocidade: { squatJump: { cargaKg: null, tempoSegundos: null }, agachamento: { cargaKg: null, tempoSegundos: null } } });
  });
  it("converte vírgula, ponto e preserva zero; omite observações vazias", () => { const fd = new FormData(); fd.set("amplitude.tornozelo.direito", "11,5"); fd.set("saltos.cmj", "11.5"); fd.set("velocidade.squatJump.cargaKg", "0"); fd.set("observacoes", "   "); const { dto } = formDataParaDTO(fd, ID); expect(dto).not.toHaveProperty("observacoes"); expect(dto).toHaveProperty("amplitude.tornozelo.direito", 11.5); expect(dto).toHaveProperty("saltos.cmj", 11.5); expect(dto).toHaveProperty("velocidade.squatJump.cargaKg", 0); });
  it("coleta todos os erros lexicais", () => { const fd = new FormData(); fd.set("saltos.cmj", "1e3"); fd.set("saltos.salto2", "+1"); expect(Object.keys(formDataParaDTO(fd, ID).errosLexicais)).toEqual(["saltos.cmj", "saltos.salto2"]); });
});
