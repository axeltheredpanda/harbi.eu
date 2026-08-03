import { SkeletonCard } from "@/frontend/ui/skeleton";

export default function CutoutLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true">
      <div className="h-9 w-36 rounded-sm bg-surface" />
      <SkeletonCard />
      <div className="h-64 rounded-sm bg-surface" />
    </div>
  );
}
