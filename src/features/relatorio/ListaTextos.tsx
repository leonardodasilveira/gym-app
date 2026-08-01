import { EmptyState } from "@/components/ui/empty-state";

/**
 * Generico: reusado por melhorias e pontos de atencao (mesma forma,
 * string[]). Texto exibido exatamente como veio do backend — nunca
 * reescrito, resumido ou corrigido.
 */
export function ListaTextos({
  itens,
  mensagemVazia,
}: {
  itens: string[];
  mensagemVazia: string;
}) {
  if (itens.length === 0) {
    return <EmptyState titulo={mensagemVazia} />;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {itens.map((item, indice) => (
        <li key={indice}>{item}</li>
      ))}
    </ul>
  );
}
