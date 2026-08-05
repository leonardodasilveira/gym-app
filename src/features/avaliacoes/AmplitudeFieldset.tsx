import { CampoFormulario } from "@/components/ui/campo-formulario";
import { CAMPOS_AMPLITUDE } from "./catalogoV2";
import type { ReferenciaAnteriorV2 } from "./mappers";
import type { ErrosAvaliacaoV2 } from "./tipos";
import { formatarData, formatarNumeroOuTraco } from "@/features/shared/formato";

type Props = { referencia: ReferenciaAnteriorV2 | null; erros: ErrosAvaliacaoV2; valores: Record<string, string> };
export function AmplitudeFieldset({ referencia, erros, valores }: Props) {
  return <fieldset className="rounded-lg border p-4"><legend className="px-2 font-semibold">Amplitude</legend><p className="text-sm text-muted-foreground">Deixe em branco o que não foi medido. Em branco é diferente de zero: zero significa que a medida foi feita e deu zero.</p>{referencia ? <p className="mt-2 text-sm font-medium">Última avaliação ({formatarData(referencia.dataAvaliacao)})</p> : null}<div className="mt-4 flex flex-col gap-5">{CAMPOS_AMPLITUDE.map((campo) => <div key={campo.chaveDto}><p className="mb-2 font-medium">{campo.sigla} — {campo.nome} (cm)</p><div className="grid gap-3 md:grid-cols-2">{(["direito", "esquerdo"] as const).map((lado) => { const nome = `amplitude.${campo.chaveDto}.${lado}`; const valorAnterior = referencia?.amplitude[campo.chaveDto][lado]; return <CampoFormulario key={lado} id={nome} name={nome} label={lado === "direito" ? "Direito" : "Esquerdo"} type="text" inputMode="decimal" defaultValue={valores[nome] ?? ""} apoio={referencia && valorAnterior !== null && valorAnterior !== undefined ? `Última: ${formatarNumeroOuTraco(valorAnterior)} cm` : undefined} erro={erros[nome]} />; })}</div></div>)}</div></fieldset>;
}
