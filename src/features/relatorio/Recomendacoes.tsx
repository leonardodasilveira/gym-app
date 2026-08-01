import { EmptyState } from "@/components/ui/empty-state";
import type { RelatorioResponse } from "@/features/relatorio/tipos";

export function Recomendacoes({
  recomendacoes,
}: {
  recomendacoes: RelatorioResponse["textos"]["recomendacoes"];
}) {
  if (recomendacoes.length === 0) {
    return <EmptyState titulo="Nenhuma recomendação registrada" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {recomendacoes.map((recomendacao) => (
        <div key={recomendacao.foco}>
          <h3 className="text-base font-medium">{recomendacao.foco}</h3>
          <p className="mt-1 text-sm">{recomendacao.objetivo}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {recomendacao.estrategias.map((estrategia, indice) => (
              <li key={indice}>{estrategia}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
