import { SkeletonCard } from "@/frontend/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-16" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-sm bg-surface" />
        <div className="h-10 w-40 rounded-sm bg-surface" />
        <div className="h-5 w-full max-w-md rounded-sm bg-surface" />
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        <div className="h-8 w-16 rounded-sm bg-surface" />
        <div className="h-8 w-14 rounded-sm bg-surface" />
        <div className="h-8 w-24 rounded-sm bg-surface" />
      </div>
      <SkeletonCard />
    </div>
  );
}
