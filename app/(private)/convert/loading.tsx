import { SkeletonCard } from "@/frontend/ui/skeleton";

export default function ConvertLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true">
      <div className="h-9 w-40 rounded-sm bg-surface" />
      <SkeletonCard />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-32 rounded-sm bg-surface" />
        <div className="h-32 rounded-sm bg-surface" />
      </div>
    </div>
  );
}
