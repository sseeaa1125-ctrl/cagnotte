export default function CagnottesListLoading() {
  return (
    <div className="container mx-auto px-4 py-12" aria-busy="true" aria-live="polite">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <div className="mx-auto mb-3 h-10 w-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="mx-auto h-4 w-96 max-w-full animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mx-auto mb-8 flex max-w-sm justify-center gap-2">
        <div className="h-10 w-24 animate-pulse rounded-full bg-gray-100" />
        <div className="h-10 w-24 animate-pulse rounded-full bg-gray-100" />
        <div className="h-10 w-24 animate-pulse rounded-full bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="aspect-video w-full animate-pulse bg-gray-100" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="h-2 w-full animate-pulse rounded-full bg-gray-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
