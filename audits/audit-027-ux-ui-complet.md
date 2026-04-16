# Audit 027 — Audit UX/UI Complet du Frontend

**Date** : 2026-04-16
**Scope** : Toutes les pages frontend (auth, dashboard, profil, retraits, notifications, cagnottes publiques)
**Sévérité** : P0 = bloquant prod, P1 = haute, P2 = moyenne

---

## RÉSUMÉ

| Sévérité | Nombre | Résumé |
|----------|--------|--------|
| **P0** | 2 | Bouton Google OAuth actif sans backend + zoom désactivé (WCAG) |
| **P1** | 7 | Erreurs UX critiques (double erreur login, paste OTP cassé, CTA morts, registre formel incohérent, mauvais message KYC) |
| **P2** | 8 | Accessibilité, code dupliqué, badges cachés mobile, tokens design contournés |

---

## P0 — BLOQUANTS PRODUCTION

### P0-01 — Bouton Google OAuth actif sans backend

**Fichiers** : `src/lib/features.ts:12`, `connexion/page.tsx`, `inscription/page.tsx`

`FEATURE_SOCIAL_AUTH = true` alors que le backend Google Auth a été supprimé dans le fork cleanup. Le bouton "Continuer avec Google" est **visible et cliquable** sur les pages connexion et inscription. Un clic redirige vers `BACKEND_URL/api/auth/google/authorize` qui retourne un 404.

**Impact** : Tout nouvel utilisateur qui clique sur Google (le CTA le plus visible, placé avant l'email) rebondit sur une erreur.

**Fix** : Passer `FEATURE_SOCIAL_AUTH = false` dans `src/lib/features.ts`.

---

### P0-02 — Zoom désactivé (violation WCAG 1.4.4)

**Fichier** : `src/app/layout.tsx` (viewport meta)

```ts
maximumScale: 1,
userScalable: false
```

Empêche les utilisateurs malvoyants de zoomer. C'est une violation WCAG 1.4.4 (Resize Text). Affecte TOUTES les pages.

**Fix** : Supprimer `maximumScale` et `userScalable` du viewport config.

---

## P1 — HAUTE SÉVÉRITÉ

### P1-01 — Erreur affichée deux fois sur la page connexion

**Fichier** : `connexion/page.tsx`

L'erreur est passée à l'`Input` via `error={error}` ET affichée dans un `<p role="alert">` séparé. Les deux éléments rendent la même string → l'utilisateur voit le message d'erreur en double.

**Fix** : Retirer le `error` prop de l'`Input` ou le `<p role="alert">`.

---

### P1-02 — Paste OTP ne fonctionne que sur le premier champ

**Fichiers** : `verification-email/page.tsx`, `mot-de-passe-reinitialiser/page.tsx`

`onPaste` est attaché seulement à `index === 0`. Si le curseur est dans la case 3 et l'utilisateur colle un code, rien ne se passe.

**Fix** : Attacher `onPaste` à toutes les cases.

---

### P1-03 — CTA "Contacter le support" pointe vers "/"

**Fichier** : `retraits/page.tsx`

Le `ProgressChecklist` et le `BlockedState` utilisent `href="/"` (homepage). L'utilisateur bloqué (KYC manquant, admin-blocked) est envoyé vers l'accueil au lieu d'une page d'aide.

**Fix** : Pointer vers `/aide` ou `mailto:support@cagnotte.sn`.

---

### P1-04 — Registre formel "vous" incohérent (4+ labels)

**Fichier** : `src/lib/constants.ts`

Tout le produit utilise le tutoiement ("ton", "tu") sauf :
- `PROFILE_LABELS.subtitle` : "Gérez **vos** informations personnelles"
- `NOTIF_PREFS_LABELS.subtitle` : "Choisissez ce que **vous** voulez recevoir."
- `PARTICIPATIONS_LABELS` : "Retrouvez toutes **les** cagnottes"

**Fix** : Harmoniser au "tu" : "Gère tes informations", "Choisis ce que tu veux recevoir", etc.

---

### P1-05 — KycForm affiche le mauvais message d'erreur

**Fichier** : `_KycForm.tsx` (~ligne 191)

Quand seul le champ `fullName` est trop court, le toast affiche "Téléverse les deux documents" au lieu de signaler le nom.

**Fix** : Vérifier `fullName` séparément avant de checker les fichiers.

---

### P1-06 — Label "Cagnottes actives" mais compte TOUTES les cagnottes

**Fichier** : `tableau-de-bord/page.tsx`

Le KPI "Cagnottes actives" affiche `cagnottes.length` qui inclut les cagnottes closes. Label trompeur.

**Fix** : Filtrer `cagnottes.filter(c => c.status === "active").length` ou changer le label en "Mes cagnottes".

---

### P1-07 — "Voir tout" commenté sur le tableau de bord

**Fichier** : `tableau-de-bord/page.tsx`

Le lien "Voir tout" des cagnottes récentes est commenté avec un `href="#"` mort. Les utilisateurs avec plus de 5 cagnottes n'ont aucun moyen de voir la liste complète.

**Fix** : Décommenter et pointer vers `/tableau-de-bord/mes-cagnottes` ou la page appropriée.

---

## P2 — MOYENNE SÉVÉRITÉ

### P2-01 — Notification tabs : anti-pattern ARIA

**Fichier** : `_NotificationsClient.tsx`

Les onglets "Toutes" / "Non lues" sont des `<Link role="tab">` qui déclenchent une navigation pleine page. Les tabs ARIA doivent être des `<button>` avec switch client-side.

---

### P2-02 — Badge "Instantané" caché sur mobile

**Fichier** : `_AmountStep.tsx`

`hidden sm:inline-flex` sur le badge "Instantané" des opérateurs Wave/Orange Money. Sur mobile (cible principale), ce signal de confiance est invisible.

**Fix** : Retirer `hidden sm:` ou le rendre toujours visible.

---

### P2-03 — `normalizePhone` dupliqué 4 fois

**Fichiers** : `_BankForm.tsx`, `_ProfileForm.tsx`, `_AmountStep.tsx`, `retraits/page.tsx`

Même fonction copier-collée. Extraire vers `@/lib/phone.ts`.

---

### P2-04 — BankForm : bouton "Enregistrer" désactivé sans explication

**Fichier** : `_BankForm.tsx`

`canSubmit` requiert `phone.length === 9` mais aucun helper text n'explique pourquoi le bouton est grisé quand le numéro fait 8 chiffres.

---

### P2-05 — Bottom padding 180px excessif

**Fichier** : `(authed)/layout.tsx`

`pb-[180px]` pour le BottomNav qui fait `h-16` (64px). 180px = 2.8× la hauteur. Gaspille de l'espace sur les petits écrans.

**Fix** : Réduire à `pb-24` (96px) avec `env(safe-area-inset-bottom)`.

---

### P2-06 — `bg-white` / `bg-gray-50` hardcodé (retraits blocked)

**Fichier** : `retraits/page.tsx`

Contourne les tokens `bg-background` / `bg-muted`. Casserait un éventuel dark mode.

---

### P2-07 — "cryptés" au lieu de "chiffrés"

**Fichier** : `constants.ts` (`BANK_ACCOUNTS_LABELS.securityNoticeBody`)

"cryptés" est un anglicisme. Le terme français correct est "chiffrés".

---

### P2-08 — Virgule manquante dans `feeHelper`

**Fichier** : `constants.ts` (ligne ~689)

`"Aucun frais caché la commission"` → manque une virgule : `"Aucun frais caché, la commission…"`

---

## NOTES COMPLÉMENTAIRES

- **Strings hardcodées** : plusieurs strings UI ("Continuer avec Email", "Annuler", "Wave Sénégal", "Orange Money") ne passent pas par les constantes — fragile pour un éventuel i18n.
- **Avatar upload** : pas de validation taille fichier côté client. Un upload 50MB échoue lentement.
- **Poppins 4 poids** chargés dans le root layout : si seuls les headings utilisent Poppins, réduire à 2 poids (~80KB économisés).
- **`suppressHydrationWarning`** sur `<body>` — masque potentiellement des bugs d'hydration.
- **5 cagnottes récentes en grille 3 colonnes** → 2 cartes sur la dernière ligne (asymétrique). Plafonner à 6 ou 3.
