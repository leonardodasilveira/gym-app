import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Página não encontrada
      </h1>
      <p className="text-muted-foreground">
        O endereço acessado não existe ou foi removido.
      </p>
      <Link href="/alunos" className="underline underline-offset-4">
        Voltar para a lista de alunos
      </Link>
    </main>
  );
}
