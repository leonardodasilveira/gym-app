import { Skeleton } from "@/components/ui/skeleton";

export default function AvaliacaoDetalheLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Skeleton className="h-5 w-32" />

      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </main>
  );
}
