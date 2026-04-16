// CONTENT-ONLY skeleton. Do NOT render an <aside> or <main> here — this
// file is Next.js's Suspense fallback for every /profil/* route, and the
// parent layout (src/app/(authed)/profil/layout.tsx → <ProfileShell>)
// already renders the navbar, left sidebar, and content card. Adding a
// second aside/main inside that content card produced a visible "double
// menu" on desktop where the skeleton sidebar sat next to the real one.
export default function ProfilLoading() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-100" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
