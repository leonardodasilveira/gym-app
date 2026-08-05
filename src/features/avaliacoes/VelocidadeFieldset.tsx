import { CampoFormulario } from "@/components/ui/campo-formulario";
import { EXERCICIOS_VELOCIDADE } from "./catalogoV2";
import type { ErrosAvaliacaoV2 } from "./tipos";

type Props = { erros: ErrosAvaliacaoV2; valores: Record<string, string> };
export function VelocidadeFieldset({ erros, valores }: Props) {
  return <fieldset className="rounded-lg border p-4"><legend className="px-2 font-semibold">Velocidade</legend><div className="flex flex-col gap-5">{EXERCICIOS_VELOCIDADE.map((exercicio) => { const base = `velocidade.${exercicio.chaveDto}`; const carga = `${base}.cargaKg`; const tempo = `${base}.tempoSegundos`; const apoio = "Informe os dois campos juntos, ou deixe os dois em branco."; return <div key={exercicio.chaveDto}><p className="mb-2 font-medium">{exercicio.rotulo}</p><div className="grid gap-3 md:grid-cols-2"><CampoFormulario id={carga} name={carga} label="Carga (kg)" type="text" inputMode="decimal" defaultValue={valores[carga] ?? ""} apoio={apoio} erro={erros[carga]} /><CampoFormulario id={tempo} name={tempo} label="Tempo (s)" type="text" inputMode="decimal" defaultValue={valores[tempo] ?? ""} apoio={apoio} erro={erros[tempo]} /></div></div>; })}</div></fieldset>;
}
