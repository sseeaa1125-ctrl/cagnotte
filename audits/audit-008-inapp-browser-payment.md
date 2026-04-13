# Audit 008 — Paiement in-app browser (TikTok vs FB/IG)

**Date** : 2026-03-24
**Fichiers modifiés** :
- `src/lib/utils.ts`
- `src/components/store/PaymentModal.tsx`

## Problème

Depuis TikTok, le bouton "Ouvrir Wave" (`<a target="_blank">`) ne sort pas du WebView.
TikTok affiche sa propre page interstitielle bloquante ("Ouvre ce lien dans ton navigateur").

## Cause racine

Le commit `314000ed` avait retiré TikTok de `isInAppBrowser()`, ne gardant que FB/IG.
Résultat : dans TikTok, le code essayait de rediriger directement vers `pay.wave.com`,
ce que le WebView TikTok bloque systématiquement.

De plus, `target="_blank"` fonctionne bien dans les WebViews Facebook et Instagram,
mais **pas du tout dans TikTok**. Il fallait donc différencier le comportement.

## Fix appliqué

### 1. `src/lib/utils.ts`
- `isInAppBrowser()` : ajout de `TikTok|musical_ly|BytedanceWebview` au regex
- Nouvelle fonction `isTikTokBrowser()` : détecte spécifiquement TikTok

### 2. `src/components/store/PaymentModal.tsx`
Deux parcours distincts dans le step "waiting" (in-app browser) :

| | **Facebook / Instagram** | **TikTok** |
|---|---|---|
| **Bouton principal** | `<a target="_blank">` Ouvrir Wave | `navigator.share()` Ouvrir dans Safari/Chrome |
| **Secondaire** | `navigator.share()` Safari/Chrome | `clipboard.writeText()` Copier le lien |
| **Tertiaire** | Copier le lien (discret) | — |
| **Message** | "ouvre le lien de paiement dans ton navigateur" | "Ce navigateur ne peut pas ouvrir Wave directement" |

### Fallback si `navigator.share` indisponible (TikTok)
→ "Copier le lien de paiement" devient le bouton principal plein.

## Vérification

- [ ] Depuis **TikTok** : bouton "Ouvrir dans Safari / Chrome" ouvre la share sheet native
- [ ] Depuis **Instagram** : bouton "Ouvrir Wave" ouvre Wave via `target="_blank"`
- [ ] Depuis **Facebook** : idem Instagram
- [ ] Depuis **Safari/Chrome mobile** : flow normal (redirect directe, pas d'interstitielle)
