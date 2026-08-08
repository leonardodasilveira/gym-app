import { buttonVariants } from "@/components/ui/button";
import { AcaoImprimir } from "@/features/relatorio/AcaoImprimir";
import {
  montarCompartilhamento,
  urlEmail,
  urlWhatsApp,
} from "@/features/relatorio/compartilhamento";
import { hrefComPeriodo, type Periodo } from "@/features/relatorio/periodo";
import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { origemAtual } from "@/features/shared/origem";

export async function AcoesRelatorio({
  relatorio,
  baseHref,
  periodo,
}: {
  relatorio: RelatorioResponse;
  baseHref: string;
  periodo: Periodo;
}) {
  const origem = await origemAtual();
  const urlDaVisao = `${origem}${hrefComPeriodo(baseHref, periodo.valorUrl)}`;
  const conteudo = montarCompartilhamento(relatorio, urlDaVisao);
  const classe = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <AcaoImprimir />
      <a
        href={urlWhatsApp(conteudo)}
        target="_blank"
        rel="noopener noreferrer"
        className={classe}
      >
        Compartilhar por WhatsApp
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
      <a href={urlEmail(conteudo)} className={classe}>
        Compartilhar por e-mail
      </a>
    </div>
  );
}
