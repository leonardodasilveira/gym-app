import Link from "next/link";

export default function AvaliacaoDetalheNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Avaliação não encontrada
      </h1>
      <p className="text-muted-foreground">
        A avaliação que você está procurando não existe ou foi removida.
      </p>
      <Link
        href="/alunos"
        className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Voltar para a lista de alunos
      </Link>
    </main>
  );
}
