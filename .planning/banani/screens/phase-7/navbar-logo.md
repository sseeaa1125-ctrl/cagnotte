# navbar-logo — Banani wireframe extract

**Banani components:** `Navbar.jsx` (1 373 chars) + `DashboardNavbar.jsx` (2 069 chars)
**Target:** `src/components/layout/PublicNavbar.tsx` + `src/components/layout/DashboardNavbar.tsx` (logo swap)
**Phase 7 plan:** 07-01

## Layout description
Both Banani navbars use an identical **2-span logo**: `cagnotte` in navy `font-black tracking-tighter` + `.sn` as a smaller gray-400 `font-medium` suffix with a left margin. This is DIFFERENT from the current implementation, which renders a single `{MISC.siteName}` string with `font-headings font-bold text-primary`.

## Key sections
- Logo is the anchor, left-aligned
- Uses `flex items-center` to baseline the two spans
- Same markup on public + dashboard navs (reusable component)

## Key copy (verbatim)
> cagnotte
> .sn

## Visual details
- **Container classes:** `text-2xl font-black tracking-tighter text-[#172866] flex items-center`
- **`.sn` span classes:** `text-gray-400 font-medium ml-1 text-lg`
- **Colors:** primary navy `#172866`, suffix `text-gray-400` (very important — the `.sn` is muted, not same color as wordmark)
- **Typography:** wordmark `font-black tracking-tighter text-2xl`, suffix `font-medium text-lg` (smaller, lighter weight)
- **Spacing:** `ml-1` gap between spans
- **No icon, no SVG** — pure text logo

## Key JSX snippet (paste-and-adapt target — IDENTICAL in both Banani navbars)

```jsx
<a className="text-2xl font-black tracking-tighter text-[#172866] flex items-center">
  cagnotte<span className="text-gray-400 font-medium ml-1 text-lg">.sn</span>
</a>
```

### Adapted for cagnottes.sn (Next.js Link + accessibility)
```tsx
<Link
  href="/"
  className="flex items-center text-2xl font-black tracking-tighter text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
  aria-label="Cagnottes.sn — Accueil"
>
  cagnotte<span className="ml-1 text-lg font-medium text-gray-400">.sn</span>
</Link>
```

## Current implementation (what to replace)

### `src/components/layout/PublicNavbar.tsx` (lines 32-38)
```tsx
<Link
  href="/"
  className="font-headings text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
>
  {MISC.siteName}
</Link>
```

### Swap diff
- `text-xl` → `text-2xl`
- `font-headings font-bold` → `font-black tracking-tighter`
- `{MISC.siteName}` (single string) → two-span split (`cagnotte` + `.sn`)
- Container becomes `flex items-center` so the spans baseline
- Apply the same change in `DashboardNavbar.tsx`

## Composition plan (Phase 3 primitives to use)
- New: **`<Logo />`** shared primitive in `src/components/layout/Logo.tsx` — takes an optional `className` prop for size overrides, renders the canonical 2-span. Used by both navbars + any future footer.
- The `MISC.siteName` constant should be deprecated (or kept only for `<title>` tags / aria-labels) since the visual split is not a plain string.

## Banani → cagnottes.sn translations needed
- `text-[#172866]` → `text-primary` (already mapped to navy in Tailwind config per CLAUDE.md)
- `tracking-tighter` is a Tailwind utility — confirm it's available (it is, default Tailwind)

## Notable details / risks
- **Font family:** Banani uses the default inherited font (looks like Inter). Current project uses `font-headings` (Poppins). Decision: keep Poppins or switch to Inter for the wordmark? Recommendation: keep `font-headings` (Poppins) but add `font-black tracking-tighter` — Poppins Black 900 with tight tracking looks excellent as a wordmark.
- **Mobile size:** On narrow screens, `text-2xl` may be too big. Consider `text-xl md:text-2xl` responsive scale.
- **Accessibility:** add `aria-label="Cagnottes.sn — Accueil"` so screen readers read the full brand name (two spans read awkwardly otherwise).
- **Dashboard active states:** `DashboardNavbar.jsx` adds `border-b-2 border-[#172866] py-2` on the active nav item — this is orthogonal to the logo swap but worth noting for a fuller nav polish pass.
