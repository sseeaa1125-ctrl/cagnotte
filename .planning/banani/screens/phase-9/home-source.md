# Home page — verbatim Banani source

User selected a single design in Banani for the home page. Fetched 2026-04-13.
Flow: `RZ5SfmH_Utgp` (Cagnotte SN)
Screen: `main.jsx` — `Cagnotte.sn Home`

## Main.jsx (page shell)

```jsx
import TopBanner from '@components/TopBanner';
import Navbar from '@components/Navbar';
import Hero from '@components/Hero';
import PublicCampaignsList from '@components/PublicCampaignsList';
import FeaturesPink from '@components/FeaturesPink';
import SolidaryCampaigns from '@components/SolidaryCampaigns';
import FAQ from '@components/FAQ';
import PreFooter from '@components/PreFooter';
import Footer from '@components/Footer';

export default function Main() {
  return (
    <div className="bg-white min-h-screen font-body">
      <TopBanner />
      <Navbar />
      <main>
        <Hero />
        <PublicCampaignsList />
        <FeaturesPink />
        <SolidaryCampaigns />
        <FAQ />
      </main>
      <PreFooter />
      <Footer />
    </div>
  );
}
```

Translation note: the project already has `TopBanner`, `PublicNavbar`, `PreFooter`, `Footer` from Phase 3 (composed blocks). The home page adds 5 new sections: `Hero`, `PublicCampaignsList`, `FeaturesPink`, `SolidaryCampaigns`, `FAQ`. These are ROUTE-SCOPED sections, not primitives — live inline in `src/app/(public)/page.tsx` or as local `_Hero.tsx`/`_Features.tsx` files.

## Hero.jsx

```jsx
<section className="bg-white py-20 px-4 text-center">
  <div className="flex justify-center items-center mb-6 text-sm font-medium text-gray-700">
    Excellent 4.6 sur 5
    <Icon i="star" size={16} className="text-[#00B67A] fill-current ml-2" />
    <span className="ml-1 font-bold">Trustpilot</span>
  </div>

  <h1 className="text-5xl md:text-7xl font-black text-[#172866] mb-6 leading-tight tracking-tight max-w-4xl mx-auto">
    La cagnotte qui <br/>
    <span className="text-gradient">fait du bien.</span>
  </h1>

  <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto font-medium">
    Des cagnottes en ligne pour faire plaisir, <br/>
    et soutenir celles et ceux qui en ont besoin.
  </p>

  <button className="bg-[#172866] text-white text-lg font-bold px-8 py-4 rounded-full mb-8 shadow-lg shadow-blue-900/20">
    Créer une cagnotte
  </button>

  <div className="flex justify-center">
    <div className="bg-[#F0FDF4] text-[#166534] rounded-full pl-2 pr-6 py-2 flex items-center shadow-sm border border-green-100 text-sm md:text-base font-medium">
      <div className="bg-[#DCFCE7] rounded-full p-2 mr-3">
        <Icon i="check" size={16} className="text-[#15803D]" />
      </div>
      En avril, les cagnottes créées sont entièrement gratuites, <span className="underline ml-1">de la création jusqu'au virement.</span>
    </div>
  </div>
</section>
```

## PublicCampaignsList.jsx

3-card grid of "Les cagnottes du moment", responsive md:grid-cols-3, with a "Voir toutes les cagnottes" button aligned right on desktop + full-width on mobile. Each card: h-48 cover image + category badge pill (absolute top-left, `bg-white/90 backdrop-blur`) + title + progress bar + "Participer" button (`bg-[#F4D3DE]` = pink accent).

```jsx
<section className="px-8 py-16 mx-4 md:mx-12 my-4 max-w-[1400px] xl:mx-auto">
  <div className="flex flex-col md:flex-row justify-between items-end mb-10">
    <div>
      <h2 className="text-3xl md:text-4xl font-black text-[#172866] mb-4 leading-tight">
        Les cagnottes du moment
      </h2>
      <p className="text-lg text-gray-600 font-medium">
        Découvrez et participez aux cagnottes créées par la communauté.
      </p>
    </div>
    <button className="hidden md:flex text-[#172866] font-bold items-center gap-2 hover:underline">
      Voir toutes les cagnottes <Icon i="arrow-right" size={20} />
    </button>
  </div>

  <div className="grid md:grid-cols-3 gap-8">
    {/* Each card */}
    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow cursor-pointer">
      <div className="h-48 relative">
        <img className="w-full h-full object-cover" />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-[#172866] flex items-center gap-1.5 shadow-sm">
          <span className="text-sm drop-shadow-sm">{icon}</span> {category}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-black text-xl text-[#172866] mb-8 leading-tight line-clamp-2">{title}</h3>
        <div className="mt-auto">
          <div className="flex justify-between items-end mb-2">
            <span className="font-bold text-lg text-[#172866]">{collected}</span>
            <span className="text-sm text-gray-500 font-medium">sur {target}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-[#172866] rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <button className="w-full bg-[#F4D3DE] hover:bg-[#efc7d5] transition-colors text-[#172866] font-bold py-3.5 rounded-xl shadow-sm">
            Participer
          </button>
        </div>
      </div>
    </div>
  </div>

  <button className="md:hidden w-full mt-8 text-[#172866] font-bold flex justify-center items-center gap-2 bg-gray-50 py-4 rounded-xl">
    Voir toutes les cagnottes <Icon i="arrow-right" size={20} />
  </button>
</section>
```

Translation notes:
- This custom card design is DIFFERENT from the Phase 3 `CampaignCard` primitive (which has a different layout). Either extend `CampaignCard` with a `variant="home-featured"` OR inline the home cards in `src/app/(public)/page.tsx` without touching the primitive. Recommend **inline** since this is a route-specific style.
- Card click → `/c/[slug]` (public donor path). "Voir toutes" button → `/cagnottes`.
- Currency: `€` → `FCFA` via `formatPrice()`. Card data from `GET /api/cagnottes?limit=3`.

## FeaturesPink.jsx

Pink section `bg-[#FBE6ED] rounded-[3rem]` with a "Faire plaisir / Soutenir" toggle pill + big H2 "Faites plaisir à vos proches" + 3-card grid.

```jsx
<section className="bg-[#FBE6ED] rounded-[3rem] px-8 py-24 mx-4 md:mx-12 my-12 text-center relative overflow-hidden">
  <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-pink-100/50 to-transparent pointer-events-none" />

  <div className="flex justify-center mb-8">
    <div className="bg-white/80 backdrop-blur rounded-full p-1 inline-flex shadow-sm">
      <button className="bg-white text-pink-900 font-bold px-6 py-2 rounded-full shadow-sm">
        Faire plaisir
      </button>
      <button className="text-gray-500 font-medium px-6 py-2 rounded-full">
        Soutenir
      </button>
    </div>
  </div>

  <h2 className="text-4xl md:text-6xl font-black text-[#172866] mb-6 max-w-3xl mx-auto leading-tight">
    Faites plaisir <br/> à vos proches.
  </h2>
  <p className="text-lg md:text-xl text-gray-700 mb-16 max-w-2xl mx-auto font-medium">
    La cagnotte en ligne pour un anniversaire, un pot de départ, un heureux événement...
  </p>

  <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto relative z-10">
    {/* Card 1 — service client */}
    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-pink-900/5 text-center flex flex-col items-center">
      <span className="text-[10px] font-bold tracking-widest text-gray-400 mb-4 uppercase">4,8/5 - 27 800+ AVIS</span>
      <h3 className="text-xl md:text-2xl font-black text-[#172866] mb-4 min-h-[64px] flex items-center">Un service client 5 étoiles</h3>
      <p className="text-gray-600 mb-8 flex-grow leading-relaxed font-medium text-sm md:text-base">Une cagnotte en ligne, c'est souvent un moment important. Liliane, Marise ou encore Hamza sont disponibles tous les jours de 9h à 18h pour vous accompagner du début à la fin.</p>
      <button className="text-xs font-bold text-[#172866] border border-gray-200 rounded-full px-6 py-2">
        Voir tous les avis
      </button>
    </div>

    {/* Card 2 — paiements safe (with icons row) */}
    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-pink-900/5 text-center flex flex-col items-center">
      <span className="text-[10px] font-bold tracking-widest text-gray-400 mb-4 uppercase">PLAT DU PIED, SÉCURITÉ.</span>
      <h3 className="text-xl md:text-2xl font-black text-[#172866] mb-4 min-h-[64px] flex items-center">Des paiements super safe</h3>
      <p className="text-gray-600 mb-8 flex-grow leading-relaxed font-medium text-sm md:text-base">Nous protégeons vos données ainsi que toutes vos transactions, grâce à notre prestataire de paiement basé en France.</p>
      <div className="flex gap-4 items-center mt-auto text-gray-700">
        <Icon i="apple" size={24} />
        <Icon i="credit-card" size={24} />
        <Icon i="smartphone" size={24} />
      </div>
    </div>

    {/* Card 3 — 6% de commission */}
    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-pink-900/5 text-center flex flex-col items-center">
      <span className="text-[10px] font-bold tracking-widest text-gray-400 mb-4 uppercase">6 % DE COMMISSION</span>
      <h3 className="text-xl md:text-2xl font-black text-[#172866] mb-4 min-h-[64px] flex items-center">Des frais pour la bonne cause</h3>
      <p className="text-gray-600 mb-8 flex-grow leading-relaxed font-medium text-sm md:text-base">Les frais des cagnottes festives permettent (entre autres) aux cagnottes solidaires d'être sans frais.</p>
      <button className="text-xs font-bold text-[#172866] border border-gray-200 rounded-full px-6 py-2">
        En savoir +
      </button>
    </div>
  </div>
</section>
```

Translation notes:
- Banani mentions "27 800+ AVIS" and "France" — these are **fake placeholders** from a French fork. Translate:
  - "27 800+ AVIS" → generic "Un service client disponible" or drop the review count
  - "notre prestataire de paiement basé en France" → "notre prestataire Bictorys, basé en Afrique de l'Ouest"
  - "6 % DE COMMISSION" — match our commission reality ("6% SOLIDAIRE · 8% FESTIVE")
- Toggle pill "Faire plaisir / Soutenir" is a VISUAL state only in the mockup (not a functional toggle). Can be decorative or wired to switch between festive/solidaire featured content.
- Icons: `apple`, `credit-card`, `smartphone` — use lucide-react.

## SolidaryCampaigns.jsx

Green accent section `bg-[#E6F3EE] rounded-[3rem]` with 4-card grid.

```jsx
<section className="bg-[#E6F3EE] rounded-[3rem] px-8 py-24 mx-4 md:mx-12 my-12 text-center">
  <h2 className="text-4xl md:text-5xl font-black text-[#172866] mb-6 leading-tight">
    Les cagnottes solidaires
  </h2>
  <p className="text-lg text-gray-700 font-medium mb-16 max-w-2xl mx-auto leading-relaxed">
    Des collectes de fonds où chaque geste compte. Même petit.
  </p>

  <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto text-left">
    {/* Card — small variant */}
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm flex flex-col p-4">
      <img className="w-full rounded-2xl object-cover mb-4" />
      <div className="flex-1 flex flex-col px-2">
        {partner && (
          <div className="text-[10px] font-bold tracking-widest text-blue-600 mb-2 uppercase flex items-center gap-1">
            <Icon i="shield-check" size={12} className="text-blue-500" />
            PARTENAIRE OFFICIEL
          </div>
        )}
        <h3 className="font-bold text-[#172866] mb-2 leading-tight">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 flex-1">{collected} récoltés</p>
        <div className="mt-auto">
          <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
            <Icon i="arrow-right" size={16} />
          </button>
        </div>
      </div>
    </div>
  </div>
</section>
```

Translation: fetch 4 solidaire cagnottes via `GET /api/cagnottes?subtype=solidaire&limit=4` (backend may need a subtype filter — check). Card click → `/c/[slug]`. "Partenaire Officiel" badge is an optional decoration, not a real backend field — can skip in v1 or add a `Block.config.isPartner` field later.

## FAQ.jsx

3 expandable questions (static markup in mockup — actual expand behavior can be done with `<details>`/`<summary>` or client state).

```jsx
<section className="bg-white py-24 px-4 text-center max-w-4xl mx-auto">
  <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-6 uppercase">FAQ</div>
  <h2 className="text-4xl md:text-5xl font-black text-[#172866] mb-12 leading-tight">
    On répond à toutes <br/> vos questions.
  </h2>

  <div className="space-y-4 text-left">
    <div className="bg-[#F4F6F9] rounded-2xl p-6 flex justify-between items-center hover:bg-gray-100 transition-colors">
      <span className="font-bold text-[#172866] text-lg">{question}</span>
      <Icon i="chevron-down" size={20} className="text-[#172866]" />
    </div>
  </div>
</section>
```

Sample questions from Banani (replace with cagnottes.sn-appropriate ones):
- "Comment utiliser l'argent de ma cagnotte en ligne ?"
- "Combien coûte une cagnotte ?"
- "Quels moyens de paiement sont acceptés ?"

## PreFooter.jsx

```jsx
<section className="bg-[#172866] text-white py-32 px-12 md:px-24 flex flex-col md:flex-row items-center justify-between relative overflow-hidden mt-12">
  <div className="z-10 w-full md:w-1/2">
    <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight tracking-tight">
      Bref, il ne vous reste <br/> qu'une chose à faire
    </h2>
    <button className="bg-white text-[#172866] px-8 py-4 rounded-full font-bold shadow-lg hover:bg-gray-100 text-lg mb-8">
      Créer une cagnotte
    </button>
    <div className="flex items-center text-sm font-medium">
      Excellent 4.6 sur 5
      <Icon i="star" size={16} className="text-[#00B67A] fill-current ml-2" />
      <span className="ml-1 font-bold">Trustpilot</span>
    </div>
  </div>
  <div className="hidden md:block absolute right-0 bottom-0 opacity-10 pointer-events-none">
    <span className="text-[300px] font-black leading-none transform translate-y-12 inline-block">U</span>
  </div>
</section>
```

This REPLACES or AUGMENTS the existing Phase 3 `PreFooter` block. Check the existing component — if it's similar, keep it; if it's different, update it.

## Banani drift translations

- `€` → `FCFA` via `formatPrice()` at every leaf
- "basé en France" → "basé en Afrique de l'Ouest" (Bictorys) or drop
- "4,8/5" reviews → generic copy (we don't have Trustpilot)
- "27 800+ AVIS" → drop or generic
- "6% commission" → "6% solidaire · 8% festive"
- Mock card data → real data from `GET /api/cagnottes`
- Phone prefix: +33 → +221 (not relevant on this page)

## Composition strategy

Recommended: use the existing Phase 3 blocks where applicable:
- `TopBanner` from `src/components/layout/TopBanner.tsx` ✅ (already shipped)
- `PublicNavbar` from Phase 3 ✅ (already shipped, with Phase 8 dynamic auth)
- `Footer` + `PreFooter` from Phase 3 ✅ (verify design matches, update if needed)

Build new ROUTE-SCOPED components (live in `src/app/(public)/_components/` or inline in page.tsx):
- `_Hero.tsx` — server component with Trustpilot line + H1 + CTA + green gratuit banner
- `_PublicCampaignsList.tsx` — server component, fetches `/api/cagnottes?limit=3`, renders custom 3-card grid (inline design, not `CampaignCard` primitive)
- `_FeaturesPink.tsx` — pink section with toggle decorative + 3 feature cards
- `_SolidaryCampaigns.tsx` — green section, fetches `/api/cagnottes?subtype=solidaire&limit=4`, renders custom 4-card grid
- `_FAQ.tsx` — 3 `<details>` elements

Each section component is a **route-scoped file** (prefix `_` = Next.js ignores in route discovery). NOT primitives. Don't add to `src/components/ui/`.

`src/app/(public)/page.tsx` becomes a server component that composes: `<TopBanner /> <PublicNavbar /> <_Hero /> <_PublicCampaignsList /> <_FeaturesPink /> <_SolidaryCampaigns /> <_FAQ /> <PreFooter /> <Footer />`. Wrap in the existing `(public)/layout.tsx` which already provides navbar + footer → avoid double rendering.

Actually check the existing `(public)/layout.tsx` — it wraps every public page with TopBanner + PublicNavbar + Footer + PreFooter. So `page.tsx` should NOT render them again — just the sections: `<_Hero /> <_PublicCampaignsList /> <_FeaturesPink /> <_SolidaryCampaigns /> <_FAQ />`.
