import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessProfileLoading() {
  return (
    <div className="container py-6">
      <Skeleton className="h-5 w-72" />
      <Skeleton className="mt-5 h-[520px] w-full" />
      <div className="grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="mt-4 h-6 w-1/2" />
          <Skeleton className="mt-8 h-48 w-full" />
          <Skeleton className="mt-6 h-80 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
