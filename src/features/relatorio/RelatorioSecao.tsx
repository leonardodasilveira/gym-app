import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

/**
 * Envelope padrao de secao do relatorio: <section> + <h2> associado por
 * aria-labelledby. Aplica a classe `relatorio-secao`, gancho para o Print
 * CSS da E3 (break-inside etc.) — sem nenhum estilo de tela associado a ela
 * hoje, existe so para a E3 usar depois.
 *
 * `provisorio`: acrescenta o selo neutro "Provisório" ao lado do titulo —
 * usado pelas secoes derivadas de formula ou texto placeholder (curva,
 * analise tecnica, melhorias, pontos de atencao, recomendacoes, conclusao).
 */
export function RelatorioSecao({
  id,
  titulo,
  provisorio = false,
  children,
}: {
  id: string;
  titulo: string;
  provisorio?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="relatorio-secao mt-8"
    >
      <div className="flex items-center gap-2">
        <h2 id={`${id}-heading`} className="text-lg font-semibold">
          {titulo}
        </h2>
        {provisorio ? <Badge variant="outline">Provisório</Badge> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
