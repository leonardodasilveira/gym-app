"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AlunosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <ErrorState
        titulo="Não foi possível carregar os alunos"
        mensagem={error.message}
        aoTentarNovamente={reset}
      />
    </main>
  );
}
