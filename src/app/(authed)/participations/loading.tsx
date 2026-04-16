export default function ParticipationsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-gray-50 p-4 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
              <div className="space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-6 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
