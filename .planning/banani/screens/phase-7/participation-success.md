# participation-success — Banani wireframe extract

**Banani component:** `ParticipationSuccess.jsx` (3 693 chars) — FOUND in sharedFiles
**Target route / primitive:** `/c/[slug]/merci` (donor-side thank-you page)
**Phase 7 plan:** 07-02

## Layout description
Centered thank-you card on gray-50 background with `rounded-[2.5rem]` shell. Top pink gradient decoration (`from-[#F4D3DE]/30`). Same `animate-ping` success hero as `WithdrawSuccess.jsx` (green check + ping ring). Title "Merci ! 🎉", amount paragraph, then a cagnotte card summary (thumbnail + title + organizer), a share-button row (WhatsApp / Facebook / Copy link), and finally primary actions.

**NOTE:** Banani does NOT have a custom "thank-you message from creator" field. That feature (`block.config.thankYouMessage`) is NEW for cagnottes.sn — this wireframe documents the BASE layout; executor must inject the custom message between the title/amount and the cagnotte card.

## Key sections
- **Pink gradient decoration:** `absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#F4D3DE]/30 to-transparent`
- **Success hero (identical to WithdrawSuccess):** `animate-ping` green ring + `E6F3EE` circle + green check icon
- **Title + amount paragraph:** "Merci ! 🎉" + "Votre participation de X € a bien été enregistrée pour la cagnotte."
- **[INJECT POINT for thankYouMessage]** — if `block.config.thankYouMessage` is set, render it here in a distinguishable card (pink-50 background, `rounded-2xl`, italic text, with creator name attribution)
- **Cagnotte card summary:** thumbnail + "Cagnotte Festive" category label + title + "Organisée par Sophie M."
- **Share row:** 3 circle buttons (WhatsApp #25D366, Facebook #1877F2, copy-link gray)
- **Primary actions:** outline "Retour à la cagnotte" + navy "Découvrir d'autres cagnottes"

## Key copy (verbatim French)
> Merci ! 🎉
> Votre participation de **50,00 €** a bien été enregistrée pour la cagnotte.
> Cagnotte Festive
> Organisée par Sophie M.
> Aidez cette cagnotte en la partageant :
> Retour à la cagnotte
> Découvrir d'autres cagnottes

## Visual details
- **Colors:** navy `#172866`, navy hover `#0f1a45`, green `#00B67A`, green bg `#E6F3EE`, pink decoration `#F4D3DE/30`, WhatsApp `#25D366`, Facebook `#1877F2`
- **Typography:** title `text-3xl md:text-5xl font-black`, paragraph `text-xl font-medium`
- **Spacing / radii:** card `rounded-[2.5rem] p-8 md:p-12 max-w-2xl`, cagnotte summary `rounded-2xl p-6`, share buttons `w-12 h-12 rounded-full`
- **Animations (critical):** `animate-ping` on success ring — IDENTICAL pattern to `WithdrawSuccess`
- **Icons:** `check`, `message-circle`, `facebook`, `link`

## Key JSX snippets

### animate-ping success hero (SHARED with WithdrawSuccess)
```jsx
<div className="relative inline-flex mb-8 mt-4 items-center justify-center">
  <div className="absolute inset-0 rounded-full bg-[#00B67A]/20 animate-ping"></div>
  <div className="w-24 h-24 bg-[#E6F3EE] rounded-full flex items-center justify-center relative z-10">
    <Icon i="check" size={48} className="text-[#00B67A]" />
  </div>
</div>
```

### Cagnotte summary card
```jsx
<div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 mb-10 text-left max-w-lg mx-auto">
  <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-200">
    <Image src={coverUrl} alt="" className="w-full h-full object-cover" />
  </div>
  <div>
    <div className="text-sm font-bold text-gray-500 mb-1">Cagnotte Festive</div>
    <h3 className="font-black text-xl text-[#172866] mb-2 leading-tight">Les 30 ans de Thomas</h3>
    <div className="text-sm text-gray-500 font-medium">Organisée par Sophie M.</div>
  </div>
</div>
```

### Share buttons row
```jsx
<div className="mb-10">
  <p className="text-sm font-bold text-gray-700 mb-4">Aidez cette cagnotte en la partageant :</p>
  <div className="flex justify-center gap-4">
    <button className="w-12 h-12 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366]/20 transition-colors">
      <Icon i="message-circle" size={24} />
    </button>
    <button className="w-12 h-12 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center hover:bg-[#1877F2]/20 transition-colors">
      <Icon i="facebook" size={24} />
    </button>
    <button className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
      <Icon i="link" size={24} />
    </button>
  </div>
</div>
```

## Suggested INJECTION for `thankYouMessage` (NEW — not in Banani)

```jsx
{block.config.thankYouMessage && (
  <div className="bg-[#FBE6ED] border border-[#F4D3DE] rounded-2xl p-6 max-w-lg mx-auto mb-10 text-left">
    <div className="flex items-start gap-3">
      <Icon i="heart" size={20} className="text-[#172866] mt-1 shrink-0" />
      <div>
        <div className="text-xs font-bold text-[#172866] uppercase tracking-wide mb-2">
          Un mot de {block.creator.firstName}
        </div>
        <p className="text-[#172866] italic font-medium leading-relaxed">
          "{block.config.thankYouMessage}"
        </p>
      </div>
    </div>
  </div>
)}
```

Placement: **between** the title+amount paragraph and the cagnotte summary card.

## Composition plan (Phase 3 primitives to use)
- New: **SuccessHero primitive** (the `animate-ping` ring — SHARED with `WithdrawSuccess`, extract once)
- New: **ShareRow primitive** (WhatsApp/Facebook/Copy — reusable on public cagnotte page too)
- New: **ThankYouMessageCard primitive** (NEW for cagnottes.sn — pink-50 card with quote + creator attribution)

## Banani → cagnottes.sn translations needed
- `50,00 €` → `50 000 FCFA` (integer, space separator)
- All copy French — OK
- Facebook share via `navigator.share()` fallback or Facebook sharer URL
- WhatsApp share via `whatsapp://send?text=...` (mobile) or `https://wa.me/?text=...`

## Notable details / risks
- The `thankYouMessage` feature is NEW — backend must expose it on the public cagnotte endpoint (`GET /api/cagnottes/:slug`) for this page to read it. Check `backend/src/routes/cagnottes.ts` whether the field is already surfaced.
- Empty state: when `thankYouMessage` is null/empty, render the base Banani layout (skip the injection block entirely — don't render an empty shell).
- Share URL must be the canonical `cagnottes.sn/c/<slug>`, not the current browser URL (which may have `?ref=…` params)
- The `animate-ping` pattern is shared with `WithdrawSuccess.jsx` — lift to a `<SuccessHero>` primitive in Phase 7.
