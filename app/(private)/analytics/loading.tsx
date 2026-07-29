export default function AnalyticsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-10" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-24 bg-surface" />
        <div className="h-10 w-56 bg-surface" />
        <div className="h-6 w-full max-w-md bg-surface" />
      </div>
      <div className="min-h-[12rem] space-y-4 border-t border-border pt-10">
        <div className="h-8 w-40 bg-surface" />
        <div className="h-12 w-72 bg-surface" />
        <div className="h-9 w-full max-w-sm bg-surface" />
      </div>
    </div>
  );
}
