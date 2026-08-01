import type { ReactNode } from "react";

/**
 * Envelope padrao de secao do relatorio: <section> + <h2> associado por
 * aria-labelledby. Aplica a classe `relatorio-secao`, gancho para o Print
 * CSS da E3 (break-inside etc.) — sem nenhum estilo de tela associado a ela
 * hoje, existe so para a E3 usar depois.
 */
export function RelatorioSecao({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="relatorio-secao mt-8"
    >
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
