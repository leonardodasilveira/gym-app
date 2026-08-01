import { Skeleton } from "@/components/ui/skeleton";

export default function NovoAlunoLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Skeleton className="h-5 w-20" />
      <div className="mt-4 max-w-lg">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
      </div>
    </main>
  );
}
