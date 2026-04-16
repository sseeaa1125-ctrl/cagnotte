# Creator Cagnotte Detail — "En ligne" badge reference

Source: Banani `DashboardCagnotteDetail.jsx` (11253 chars, **unchanged** between the two MCP fetches).

## Verdict

The Banani design has NOT changed. The tight badge markup that the user says is "correct" is the one already present in the previous fetch. Our implementation must already be diverging from this reference.

## Exact badge markup (copy-paste into implementation)

```jsx
<div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md inline-block mb-2">
  En ligne
</div>
```

## Key Tailwind classes on the badge

- `bg-green-100`           — pale green background
- `text-green-700`         — dark green text
- `text-xs`                — **extra-small font** (NOT `text-sm`)
- `font-bold`
- `px-2 py-1`              — **tight padding** (horizontal 0.5rem / vertical 0.25rem)
- `rounded-md`             — medium radius (NOT `rounded-full` pill)
- `inline-block`
- `mb-2`                   — margin-bottom from title below

## Position in the header layout

The badge sits in the left column of the detail header, stacked above the H1 title:

```jsx
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
  <div className="flex items-center gap-5">
    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-gray-100">
      <Image ... />
    </div>
    <div>
      <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md inline-block mb-2">
        En ligne
      </div>
      <h1 className="text-3xl font-black text-[#172866] leading-tight">Les 30 ans de Thomas</h1>
      ...
    </div>
  </div>
  ...
</div>
```

## Implementation checklist for bug #8

- [ ] Replace any `rounded-full` / `px-3` / `py-1.5` / `text-sm` on the status badge with the exact classes above.
- [ ] Ensure the badge is `inline-block` (not `flex`) so it shrinks to fit the text.
- [ ] Keep `mb-2` between badge and H1.
- [ ] No icon inside the badge — text only.
