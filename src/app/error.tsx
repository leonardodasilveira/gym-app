"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-24">
      <ErrorState mensagem={error.message} aoTentarNovamente={reset} />
    </main>
  );
}
