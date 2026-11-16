export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="aspect-video w-full animate-pulse rounded-xl bg-white" />
      <p className="text-sm text-muted">Loading the recipe and working out its nutrition…</p>
    </div>
  );
}
