export default function RetraitsLoading() {
  return (
    <div className="mx-auto max-w-xl" aria-busy="true" aria-live="polite">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mb-6 h-12 w-56 animate-pulse rounded-lg bg-gray-100" />
        <div className="space-y-3">
          <div className="h-14 w-full animate-pulse rounded-xl bg-gray-100" />
          <div className="h-14 w-full animate-pulse rounded-xl bg-gray-100" />
        </div>
        <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}
