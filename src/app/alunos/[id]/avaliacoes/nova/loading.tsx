import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <main className="mx-auto max-w-3xl px-6 py-10"><Skeleton className="h-8 w-48" /><Skeleton className="mt-6 h-24 w-full" />{[1,2,3].map((n) => <Skeleton key={n} className="mt-6 h-40 w-full" />)}</main>; }
