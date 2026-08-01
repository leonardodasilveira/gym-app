import { Skeleton } from "@/components/ui/skeleton";

export default function RelatorioLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Skeleton className="h-5 w-32" />

      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <Skeleton className="mt-6 h-20 w-full" />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </main>
  );
}
