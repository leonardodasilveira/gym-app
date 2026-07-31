import type { ReactNode } from "react";

/** Generico: nao conhece aluno, avaliacao ou qualquer outro dominio. */
export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center">
      <p className="text-sm font-medium">{titulo}</p>
      {descricao ? (
        <p className="text-sm text-muted-foreground">{descricao}</p>
      ) : null}
      {acao}
    </div>
  );
}
