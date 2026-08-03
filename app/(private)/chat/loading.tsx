import { Skeleton } from "@/frontend/ui/skeleton";

export default function ChatLoading() {
  return (
    <div
      className="-mx-6 -my-10 flex h-[calc(100dvh-4.25rem)] min-h-0 flex-1 flex-col gap-4 px-4 sm:-mx-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading Claudette"
    >
      <div className="flex items-center justify-between border-b border-border py-3">
        <Skeleton lines={2} className="w-48" />
        <div className="h-8 w-28 rounded-sm bg-surface" />
      </div>
      <div className="flex flex-1 flex-col gap-4 py-4">
        <Skeleton block className="ml-auto h-16 w-2/3 max-w-md" />
        <Skeleton block className="h-24 w-3/4 max-w-lg" />
        <Skeleton block className="ml-auto h-14 w-1/2 max-w-sm" />
      </div>
      <div className="h-14 rounded-md bg-surface" />
    </div>
  );
}
