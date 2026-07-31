import { Skeleton } from "@/components/ui/skeleton";

export default function AlunosLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Skeleton className="h-8 w-24" />
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-full sm:max-w-xs" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
        <div className="space-y-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </main>
  );
}
