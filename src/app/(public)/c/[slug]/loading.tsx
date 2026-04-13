export default function CagnotteDetailLoading() {
  return (
    <article className="container mx-auto px-4 py-6 md:py-10">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-muted" />
          <div className="space-y-3">
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <aside className="lg:col-span-1">
          <div className="sticky top-4 space-y-4 rounded-xl border border-border bg-background p-6">
            <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </aside>
      </div>
    </article>
  );
}
