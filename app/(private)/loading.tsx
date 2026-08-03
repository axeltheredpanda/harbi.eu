import { Skeleton, SkeletonCard } from "@/frontend/ui/skeleton";

export default function PrivateRouteLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 py-6" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-20 rounded-sm bg-surface" />
        <div className="h-9 w-48 rounded-sm bg-surface" />
        <Skeleton lines={2} />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
