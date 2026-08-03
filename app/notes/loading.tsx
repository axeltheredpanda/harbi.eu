import { Skeleton } from "@/frontend/ui/skeleton";

export default function NotesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 py-16" aria-busy="true">
      <Skeleton lines={2} label="Loading notes" />
      <div className="space-y-4">
        <Skeleton lines={3} />
        <Skeleton lines={3} />
        <Skeleton lines={2} />
      </div>
    </div>
  );
}
