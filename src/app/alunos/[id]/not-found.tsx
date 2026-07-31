import Link from "next/link";

export default function AlunoDetalheNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Aluno não encontrado
      </h1>
      <p className="text-muted-foreground">
        O aluno que você está procurando não existe ou foi removido.
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
