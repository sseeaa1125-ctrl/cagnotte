# Audit 009 — Flow paiement TikTok (et autres in-app browsers)

**Date** : 24 mars 2026  
**Statut** : ✅ Prêt à push

---

## Contexte

Les navigateurs in-app (TikTok, Instagram, Facebook) bloquent les redirections vers les domaines de paiement externes (`pay.wave.com`). Chaque WebView a un comportement différent.

---

## Détection des navigateurs

### `src/lib/utils.ts`

| Fonction | Détecte | User-Agent patterns |
|---|---|---|
| `isInAppBrowser()` | FB + IG + TikTok | `FBAN\|FBAV\|Instagram\|TikTok\|musical_ly\|BytedanceWebview` |
| `isTikTokBrowser()` | TikTok uniquement | `TikTok\|musical_ly\|BytedanceWebview` |

---

## Flow par navigateur

### Safari / Chrome (navigateur normal)
```
Clic "Payer" → API → window.location.href = pay.wave.com
→ Wave s'ouvre directement ✅
→ Après paiement : Wave redirect vers /{slug}/success ✅
```
- **Interstitielle** : aucune
- **Nombre de taps** : 1

### Instagram / Facebook (Meta WebView)
```
Clic "Payer" → API → interstitielle custom (polling en background)
→ Bouton "Ouvrir Wave" (target="_blank") → Wave s'ouvre dans Safari ✅
→ Après paiement : Wave redirect vers /{slug}/success ✅
→ Page originale : polling détecte PAID → redirect aussi ✅
```
- **Interstitielle** : notre modal custom
- **Bouton principal** : "Ouvrir Wave" (`<a target="_blank">`)
- **Bouton secondaire** : "Ouvrir dans Safari / Chrome" (`navigator.share`)
- **Bouton tertiaire** : "Copier le lien"
- **Nombre de taps** : 2 (clic Payer + clic Ouvrir Wave)

### TikTok (ByteDance WebView)
```
Clic "Payer" → API → interstitielle custom (polling en background)
→ Bouton "Ouvrir dans le navigateur" (navigator.share) → share sheet → Safari → Wave ✅
→ Après paiement : Wave redirect vers /{slug}/success ✅
```
- **Interstitielle** : notre modal custom (PAS celle de TikTok)
- **Bouton principal** : "Ouvrir dans le navigateur" (`navigator.share()`)
- **Bouton secondaire** : "Copier le lien" (`navigator.clipboard`)
- **Nombre de taps** : 3 (clic Payer + clic Ouvrir dans le navigateur + clic Safari dans share sheet)

---

## Pourquoi TikTok est différent

TikTok bloque **toute navigation sortante** depuis son WebView :

| Méthode | Instagram/FB | TikTok |
|---|---|---|
| `<a target="_blank">` | ✅ Ouvre dans Safari | ❌ Bloqué |
| `window.location.href` (async) | ❌ Bloqué | ❌ Bloqué |
| `window.location.href` (user click) | — | ❌ Bloqué |
| Redirect 302 serveur | — | ❌ Bloqué |
| Redirect 302 + URL Base64 | — | ❌ Bloqué |
| `navigator.share()` | ✅ | ✅ (seule sortie) |

`navigator.share()` est la **seule façon de sortir du WebView TikTok** car c'est une API système (iOS/Android), pas une navigation web.

---

## Approches testées et rejetées

1. **Retirer TikTok de `isInAppBrowser()`** → `window.location.href` après API = bloqué par TikTok (page interstitielle TikTok)
2. **`window.location.href` sur clic direct (user gesture)** → bloqué aussi
3. **Proxy redirect `/api/pay-redirect?url=pay.wave.com`** → TikTok scanne les query params, bloqué
4. **Proxy redirect + URL Base64 `/api/pay-redirect?t=BASE64`** → bloqué quand même

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/lib/utils.ts` | `isInAppBrowser()` inclut TikTok, ajout `isTikTokBrowser()` |
| `src/components/store/PaymentModal.tsx` | Branche TikTok avec `navigator.share` en principal |
| `src/app/api/pay-redirect/route.ts` | Route créée mais non utilisée (TikTok la bloque aussi) |

---

## Retour post-paiement (aucun risque)

Le backend configure `successRedirectUrl` et `errorRedirectUrl` lors de la création de la commande :
```
successRedirectUrl: ${BICTORYS_REDIRECT_URL}/${sellerSlug}/success?ref=${reference}&type=${orderType}
errorRedirectUrl: ${BICTORYS_REDIRECT_URL}/${sellerSlug}/error?ref=${reference}
```

Après paiement Wave, l'utilisateur est **toujours** redirigé vers la page success, quel que soit le navigateur d'origine. Le polling dans le PaymentModal est un bonus pour FB/IG (où la page originale reste ouverte).
