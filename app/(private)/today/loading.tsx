import { Skeleton, SkeletonCard } from "@/frontend/ui/skeleton";

export default function TodayLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8" aria-busy="true">
      <Skeleton lines={2} label="Loading today" />
      <SkeletonCard />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton block className="h-28" />
        <Skeleton block className="h-28" />
      </div>
    </div>
  );
}
