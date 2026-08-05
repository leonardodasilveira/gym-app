import { CampoFormulario } from "@/components/ui/campo-formulario";
import { CAMPO_CMJ, SALTOS_PROVISORIOS } from "./catalogoV2";
import type { ReferenciaAnteriorV2 } from "./mappers";
import type { ErrosAvaliacaoV2 } from "./tipos";
import { formatarData, formatarNumeroOuTraco } from "@/features/shared/formato";

type Props = { referencia: ReferenciaAnteriorV2 | null; erros: ErrosAvaliacaoV2; valores: Record<string, string> };
export function SaltosFieldset({ referencia, erros, valores }: Props) {
  const cmj = "saltos.cmj";
  return <fieldset className="rounded-lg border p-4"><legend className="px-2 font-semibold">Salto</legend>{referencia ? <p className="text-sm font-medium">Última avaliação ({formatarData(referencia.dataAvaliacao)})</p> : null}<div className="mt-4"><CampoFormulario id={cmj} name={cmj} label={`${CAMPO_CMJ.sigla} — ${CAMPO_CMJ.nome} (cm)`} type="text" inputMode="decimal" defaultValue={valores[cmj] ?? ""} apoio={referencia?.cmj !== null && referencia?.cmj !== undefined ? `Última: ${formatarNumeroOuTraco(referencia.cmj)} cm` : undefined} erro={erros[cmj]} /></div><p className="mt-5 text-sm text-muted-foreground">Unidade ainda não confirmada com o professor. Os quatro campos abaixo são registrados como número puro, sem cm, % ou m/s, até o backend publicar o catálogo definitivo.</p><div className="mt-3 grid gap-4 sm:grid-cols-2">{SALTOS_PROVISORIOS.map((campo) => { const nome = `saltos.${campo.chaveDto}`; return <CampoFormulario key={campo.chaveDto} id={nome} name={nome} label={campo.rotulo} type="text" inputMode="decimal" defaultValue={valores[nome] ?? ""} erro={erros[nome]} />; })}</div></fieldset>;
}
