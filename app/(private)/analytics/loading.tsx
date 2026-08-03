import { Skeleton, SkeletonCard } from "@/frontend/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-10" aria-busy="true">
      <Skeleton lines={3} label="Loading analytics" />
      <div className="min-h-[12rem] space-y-4 border-t border-border pt-10">
        <SkeletonCard />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton block className="h-24" />
          <Skeleton block className="h-24" />
        </div>
      </div>
    </div>
  );
}
