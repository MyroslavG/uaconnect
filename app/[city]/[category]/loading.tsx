import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <div>
      <div className="border-b bg-card/40">
        <div className="container py-10">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="mt-6 h-12 w-full max-w-2xl" />
          <Skeleton className="mt-4 h-16 w-full" />
        </div>
      </div>
      <div className="container grid gap-6 py-8 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-96 w-full" />
          ))}
        </div>
        <Skeleton className="hidden h-[520px] lg:block" />
      </div>
    </div>
  );
}
