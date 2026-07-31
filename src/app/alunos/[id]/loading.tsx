import { Skeleton } from "@/components/ui/skeleton";

export default function AlunoDetalheLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Skeleton className="h-5 w-20" />

      <div className="mt-4 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-3 h-24 w-full" />
        </div>
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="mt-3 h-32 w-full" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="mt-3 h-32 w-full" />
      </div>
    </main>
  );
}
