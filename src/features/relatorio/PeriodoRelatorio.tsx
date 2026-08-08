import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/components/utils";
import {
  hrefComPeriodo,
  OPCOES_PERIODO,
  type Periodo,
} from "@/features/relatorio/periodo";

export function PeriodoRelatorio({
  baseHref,
  periodo,
}: {
  baseHref: string;
  periodo: Periodo;
}) {
  return (
    <div>
      <p className="text-sm font-medium">Janela:</p>
      <nav
        aria-label="Janela de período do relatório"
        className="mt-2 flex flex-wrap gap-2"
      >
        {OPCOES_PERIODO.map((opcao) => {
          const ativa = opcao.valorUrl === periodo.valorUrl;

          return (
            <Link
              key={opcao.valorUrl}
              href={hrefComPeriodo(baseHref, opcao.valorUrl)}
              aria-current={ativa ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: ativa ? "default" : "outline",
                  size: "sm",
                }),
                "h-11 sm:h-9",
              )}
            >
              {opcao.rotulo}
            </Link>
          );
        })}
      </nav>
      <p className="mt-2 text-sm text-muted-foreground">
        A janela afeta o resumo executivo e o histórico de CMJ. Medidas e
        velocidade são sempre as da avaliação de referência.
      </p>
    </div>
  );
}
