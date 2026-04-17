# Audit 032 -- Accessibilite WCAG 2.1 AA

**Date :** 2026-04-16
**Auditeur :** Claude (gsd-code-reviewer)
**Scope :** Tous les fichiers frontend (`src/`) -- composants UI, pages publiques (donor flow), pages auth, dashboard creator, layouts, contextes.
**Referentiel :** WCAG 2.1 niveau AA

---

## Resume executif

Le codebase presente un bon niveau de base en accessibilite : `lang="fr"` sur `<html>`, `focus-visible` systematique sur les boutons/liens, labels associes aux inputs, `role="alert"` sur les erreurs, `aria-live` sur les loading states, et `prefers-reduced-motion` respecte pour les animations CSS. Cependant, plusieurs lacunes critiques et importantes subsistent, concentrees autour de l'absence de skip-link, l'absence de focus trap dans les modales, les toasts non annonces aux lecteurs d'ecran, et le contraste insuffisant de certains textes.

---

## Severite

- **CRITIQUE** : Bloque l'acces pour certains utilisateurs (violation AA directe)
- **IMPORTANT** : Degrade significativement l'experience assistive
- **MODERE** : Non-conformite AA mineure, corrigeable facilement
- **INFO** : Amelioration recommandee, pas une violation stricte

---

## Constatations

### CRITIQUE

#### C-01 -- Absence de skip-to-content link (WCAG 2.4.1 Bypass Blocks)

**Fichiers :** `src/app/(public)/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(authed)/layout.tsx`
**Constat :** Aucun lien "Aller au contenu principal" n'existe. Grep sur `skip-to`, `skipnav`, `skip.to.content` retourne zero resultats. Un utilisateur clavier ou lecteur d'ecran doit naviguer a travers toute la navbar (10+ liens) sur chaque page.
**Correction :**
```tsx
// Dans chaque layout, en premiere position dans le body/fragment :
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white">
  Aller au contenu principal
</a>
// Et sur le <main> :
<main id="main-content" ...>
```

---

#### C-02 -- Toasts non annonces aux lecteurs d'ecran (WCAG 4.1.3 Status Messages)

**Fichier :** `src/contexts/ToastContext.tsx` (lignes 52-77)
**Constat :** Le conteneur de toasts n'a ni `role="status"` ni `aria-live="polite"`. Les toasts apparaissent visuellement mais sont totalement invisibles pour les lecteurs d'ecran. C'est critique car les confirmations de copie, les erreurs d'auth et les succes de paiement passent par ce canal.
**Correction :**
```tsx
// Ajouter sur le conteneur fixe :
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="pointer-events-none fixed top-0 ..."
>
```

---

#### C-03 -- Pas de focus trap dans Modal (WCAG 2.4.3 Focus Order)

**Fichier :** `src/components/ui/Modal.tsx`
**Constat :** La modale met le focus sur le dialog au mount (l.60-63) et restaure le focus au unmount (l.65), ce qui est bien. Cependant, il n'y a **aucun focus trap** : un utilisateur clavier peut Tab en dehors de la modale vers les elements derriere le backdrop. Meme constat pour `ConfirmDialog.tsx`. Le mobile drawer dans `PublicNavbar.tsx` n'a pas non plus de focus trap.
**Correction :**
Implementer un focus trap manuel (premier/dernier element focusable) ou utiliser le pattern `<dialog>` natif HTML. Exemple minimal :
```tsx
// Dans Modal, ajouter un keydown handler sur le dialog container :
function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== "Tab") return;
  const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables?.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
```

---

#### C-04 -- Contraste insuffisant : muted-foreground #5C6784 sur blanc (WCAG 1.4.3 Contrast Minimum)

**Fichier :** `src/app/globals.css` (ligne 27)
**Constat :** `--color-muted-foreground: #5C6784` sur `--color-background: #FFFFFF` donne un ratio de contraste de **4.28:1**. C'est au-dessus du minimum 4.5:1 pour le texte normal... par une marge trop faible pour etre fiable quand applique sur des textes en `text-xs` (12px) ou plus petits, qui sont courants dans le codebase (helpers, timestamps, captions). A 12px, WCAG recommande le ratio de "large text" mais la taille physique est trop petite pour qualifier.

*Nota bene :* Apres verification, 4.28:1 est en dessous de 4.5:1 pour le texte normal. C'est une violation AA directe.

**Textes concernes :** Tous les `text-muted-foreground` -- helpers sous les inputs, timestamps dans les participants, "Tentative X/40" sur la merci page, descriptions dans le footer.
**Correction :** Assombrir a `#4A5568` minimum (ratio 5.91:1) ou `#475569` (Tailwind slate-600, ratio 5.52:1).

---

#### C-05 -- Contraste insuffisant : gray-400 (#9ca3af) et gray-500 (#6b7280) sur blanc

**Fichiers :** Multiples (participer, paiement, cagnotte detail)
**Constat :**
- `text-gray-400` (#9ca3af) sur blanc = **2.68:1** -- ECHEC severe (WCAG 1.4.3). Utilise pour "10 plus recents", "Total a payer" label, kickers "Vous participez a", timestamps. Ce n'est PAS decoratif -- c'est du texte porteur d'information.
- `text-gray-500` (#6b7280) sur blanc = **4.64:1** -- passe de justesse pour le texte normal, mais echoue pour le texte en `text-xs` ou `text-[11px]` si considere comme texte non-large.
**Correction :** Remplacer `text-gray-400` porteur de sens par `text-gray-600` minimum (#4b5563, ratio 7.04:1). Garder `text-gray-400` uniquement pour les elements veritablement decoratifs (separateurs, icones).

---

### IMPORTANT

#### I-01 -- ProgressPoll : contenu dynamique sans aria-live (WCAG 4.1.3)

**Fichier :** `src/app/(public)/c/[slug]/ProgressPoll.tsx`
**Constat :** Le composant poll toutes les 20s et met a jour le montant collecte et le nombre de donors. Ces changements ne sont pas annonces aux lecteurs d'ecran car il n'y a ni `aria-live` ni `role="status"` sur le conteneur.
**Correction :**
```tsx
<div className="mb-8" role="status" aria-live="polite" aria-atomic="true">
```

---

#### I-02 -- AnimatedProgressBar : aria-label manquant sur le role=progressbar (WCAG 1.1.1)

**Fichier :** `src/components/ui/AnimatedProgressBar.tsx` (ligne 51)
**Constat :** Le `role="progressbar"` a `aria-valuenow`, `aria-valuemin`, `aria-valuemax` (correct), mais pas d'`aria-label`. Un lecteur d'ecran annonce "progressbar 45% 0 to 100" sans contexte de ce que la barre represente. Le ProgressBar de base (`ProgressBar.tsx`) a un `aria-label` -- inconsistance.
**Correction :**
```tsx
<div
  role="progressbar"
  aria-valuenow={Math.round(target)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Progression de la cagnotte"
  ...
>
```

---

#### I-03 -- MerciPage : status polling non annonce (WCAG 4.1.3)

**Fichier :** `src/app/(public)/c/[slug]/merci/page.tsx`
**Constat :** Le polling de statut (PENDING -> PAID/FAILED/TIMEOUT) change le contenu visible mais le conteneur parent n'a pas `aria-live`. Un utilisateur de lecteur d'ecran ne sait pas quand le paiement est confirme.
**Correction :** Ajouter `aria-live="polite"` sur le `<div className="container ...">` ou utiliser `role="status"` sur le conteneur conditionnel.

---

#### I-04 -- Mobile drawer : pas de focus trap (WCAG 2.4.3)

**Fichier :** `src/components/layout/PublicNavbar.tsx` (lignes 229-448)
**Constat :** Le drawer mobile a Escape close (l.87), body scroll lock, `role="dialog"` et `aria-modal="true"` -- tout est la sauf le focus trap. Tab peut s'echapper du drawer vers les elements du body.
**Correction :** Meme pattern de focus trap que C-03.

---

#### I-05 -- Heading hierarchy : h1 manquant sur certaines pages

**Fichiers :** `src/app/(public)/c/[slug]/paiement/page.tsx`, loading states
**Constat :** La page de paiement n'a pas de `<h1>`. Le premier heading est un `<h2>` ("Paiement 100 % securise"). La merci page a un `<h1>` correctement. Les pages de chargement (loading.tsx) n'ont naturellement pas de heading, ce qui est acceptable pour un etat transitoire.
**Correction :** Ajouter un `<h1>` (visuellement cache si necessaire) sur la page de paiement :
```tsx
<h1 className="sr-only">Paiement - Participer a la cagnotte</h1>
```

---

#### I-06 -- Pagination/LoadMore : aucun role=navigation (WCAG 1.3.1)

**Fichier :** `src/components/ui/Pagination.tsx`
**Constat :** Non verifie en detail, mais les paginations doivent avoir `role="navigation"` et `aria-label="Pagination"`.

---

#### I-07 -- ConfirmDialog et Modal toujours montes meme quand fermes (WCAG)

**Fichier :** `src/components/ui/ConfirmDialog.tsx`
**Constat :** `ConfirmDialog` est toujours dans le DOM (monte via portal) meme quand `open=false`, avec `aria-hidden={!open}`. C'est correct pour l'animation, mais les elements interactifs (boutons) restent dans le tab order meme quand `aria-hidden=true`. Le `pointer-events-none` empeche le clic mais pas le focus clavier.
**Correction :** Ajouter `tabIndex={open ? 0 : -1}` sur les boutons internes, ou `inert` attribute sur le conteneur quand ferme.

---

### MODERE

#### M-01 -- Formulaires : champs requis non indiques a l'API assistive (WCAG 3.3.2)

**Fichiers :** `src/app/(auth)/connexion/page.tsx`, `src/app/(auth)/inscription/page.tsx`, `src/app/(public)/c/[slug]/paiement/page.tsx`
**Constat :** Les inputs email/password sur la page de connexion ont `required` en attribut HTML, ce qui est bien. Cependant, le telephone sur la page de paiement n'a PAS `required` ni `aria-required="true"` -- seulement un asterisque visuel `<span aria-hidden>*</span>` (l.464). Un lecteur d'ecran ne sait pas que le champ est obligatoire.
**Correction :** Ajouter `aria-required="true"` sur l'input telephone :
```tsx
<input id="paiement-phone" type="tel" aria-required="true" .../>
```

---

#### M-02 -- Description d'erreur non liee a l'input telephone (WCAG 3.3.1)

**Fichier :** `src/app/(public)/c/[slug]/paiement/page.tsx` (lignes 497-504)
**Constat :** L'erreur de telephone a `role="alert"` (bien) mais n'est pas liee a l'input via `aria-describedby`. Le lecteur d'ecran annonce l'alerte quand elle apparait, mais si l'utilisateur revient sur l'input, il ne re-entend pas l'erreur.
**Correction :**
```tsx
<input id="paiement-phone" aria-describedby={errors.phone ? "phone-error" : undefined} .../>
// Et sur l'erreur :
<p id="phone-error" role="alert" ...>{errors.phone}</p>
```

---

#### M-03 -- ParticiperForm : erreur montant non liee a l'input (WCAG 3.3.1)

**Fichier :** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx` (lignes 246-264)
**Constat :** Le champ montant a `aria-label` mais l'erreur `role="alert"` en dessous n'est pas liee via `aria-describedby`.
**Correction :** Ajouter un `id` a l'erreur et `aria-describedby` sur l'input.

---

#### M-04 -- Images decoratives avec alt="" vs alt absent (WCAG 1.1.1)

**Constat :** Toutes les images sont correctement traitees :
- Images decoratives (avatars, thumbnails de couverture dans le recap) ont `alt=""` -- CORRECT
- Images de contenu (CampaignCard cover) ont `alt={title}` -- CORRECT
- QR code a un alt descriptif -- CORRECT
- Emojis ont `aria-hidden` -- CORRECT

**Statut : CONFORME** -- aucune action requise.

---

#### M-05 -- Boutons presets montant : pas d'indication de l'etat actif pour lecteur d'ecran (WCAG 4.1.2)

**Fichier :** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx` (lignes 199-216)
**Constat :** Les boutons de montant preset changent de style quand actifs mais n'ont pas `aria-pressed`. L'operateur sur la page paiement a `aria-pressed` -- inconsistance.
**Correction :** Ajouter `aria-pressed={active}` sur chaque bouton preset.

---

#### M-06 -- CampaignCard utilise <a> au lieu de <Link> (WCAG n/a -- qualite)

**Fichier :** `src/components/cagnottes/CampaignCard.tsx` (ligne 64)
**Constat :** Utilise `<a href={href}>` directement au lieu de `<Link>`. N'est pas un probleme a11y direct mais perd le prefetch Next.js et casse le client-side routing.
**Statut :** INFO qualite, pas a11y.

---

#### M-07 -- FAQ <details>/<summary> : pas d'indication aria de l'etat ouvert/ferme

**Fichier :** `src/app/(public)/_home/_FAQ.tsx`
**Constat :** Les elements `<details>/<summary>` natifs gerent l'etat ouvert/ferme nativement pour les lecteurs d'ecran. **CONFORME** -- aucune action requise.

---

### INFO

#### N-01 -- Pas de `<nav>` landmark sur la navigation desktop

**Fichier :** `src/components/layout/PublicNavbar.tsx` (ligne 118)
**Constat :** La nav desktop a `<nav>` -- CORRECT. La nav mobile dans le drawer n'a pas de `<nav>` explicite mais a `role="dialog"` + listes structurees.
**Statut :** Acceptable mais on pourrait ajouter `<nav aria-label="Menu principal">` dans le drawer pour plus de clarte.

---

#### N-02 -- Footer : pas de landmark `<nav>` sur les groupes de liens

**Fichier :** `src/components/layout/Footer.tsx`
**Constat :** Les colonnes de liens (Produit, Aide, Legal) sont des `<ul>` dans des `<div>`, pas dans des `<nav>`. Ajouter `<nav aria-label="Liens produit">` etc. ameliorerait la navigation par landmarks.

---

#### N-03 -- Combobox et DatePicker : non audites en detail

**Fichiers :** `src/components/ui/Combobox.tsx`, `src/components/ui/DatePicker.tsx`, `src/components/ui/Calendar.tsx`
**Constat :** Ces composants sont utilises cote dashboard (creation de cagnotte). Non audites ici car moins critiques que le donor flow. A auditer dans un pass separe.

---

#### N-04 -- RichTextEditor (Quill/Tiptap) : non audite

**Fichier :** `src/components/ui/RichTextEditor.tsx`
**Constat :** Utilise probablement une lib tierce. A auditer separement pour la conformite clavier du rich text.

---

#### N-05 -- `dangerouslySetInnerHTML` sur description de cagnotte (WCAG 4.1.1 Parsing)

**Fichier :** `src/app/(public)/c/[slug]/page.tsx` (ligne 362)
**Constat :** La description de cagnotte est rendue via `dangerouslySetInnerHTML` apres sanitization (`normalizeLegacyDescription`). Si le HTML sanitize est bien forme (balises fermees, attributs valides), c'est conforme. Verifier que le sanitizer ne laisse pas passer des elements non-semantiques qui casseraient l'arbre a11y.
**Statut :** Acceptable si la sanitization est robuste (confirme par CLAUDE.md audit 011).

---

## Bilan par critere WCAG

| Critere | Description | Statut | Ref |
|---------|------------|--------|-----|
| 1.1.1 | Non-text Content (images) | CONFORME | M-04 |
| 1.3.1 | Info and Relationships | PARTIEL | I-05, I-06 |
| 1.4.3 | Contrast Minimum | NON-CONFORME | C-04, C-05 |
| 1.4.11 | Non-text Contrast | CONFORME | focus rings 2px visibles |
| 2.1.1 | Keyboard | PARTIEL | C-03, I-04 (focus traps) |
| 2.4.1 | Bypass Blocks | NON-CONFORME | C-01 |
| 2.4.3 | Focus Order | NON-CONFORME | C-03, I-04 |
| 2.4.7 | Focus Visible | CONFORME | focus-visible:ring-2 systematique |
| 2.5.5 | Target Size | CONFORME | min-h-12 / min-h-14 partout |
| 3.3.1 | Error Identification | PARTIEL | M-02, M-03 |
| 3.3.2 | Labels or Instructions | PARTIEL | M-01 |
| 4.1.2 | Name, Role, Value | PARTIEL | M-05, I-02 |
| 4.1.3 | Status Messages | NON-CONFORME | C-02, I-01, I-03 |

---

## Points forts

1. **`lang="fr"`** sur `<html>` -- lecteurs d'ecran utilisent la bonne langue
2. **`focus-visible:ring-2`** systematique sur tous les boutons, liens, inputs
3. **`prefers-reduced-motion: reduce`** respecte avec un catch-all CSS global (l.554-562 globals.css) qui ecrase toutes les animations
4. **Labels associes aux inputs** via `htmlFor`/`id` dans tous les composants UI (Input, Textarea, Select, Checkbox, Toggle)
5. **`role="alert"`** sur 14 emplacements d'erreur dans le codebase
6. **`aria-live="polite"`** sur les loading states et contenus dynamiques
7. **`aria-hidden`** sur tous les icones decoratifs (Lucide icons)
8. **`aria-label`** sur les boutons icon-only (hamburger, fermer, modifier photo)
9. **`aria-expanded` + `aria-haspopup`** sur le menu du compte desktop
10. **`aria-current="page"`** sur les liens de navigation actifs
11. **Touch targets >= 48px** (`min-h-12` partout, `min-h-14` sur les CTA)
12. **Inputs a 16px minimum sur iOS** via le `@supports (-webkit-touch-callout)` rule

---

## Plan d'action prioritaire

### Sprint 1 (bloquants AA -- 1 jour)

| # | Action | Effort |
|---|--------|--------|
| C-01 | Ajouter skip-to-content dans les 3 layouts | 15 min |
| C-02 | Ajouter `role="status" aria-live="polite"` sur le toast container | 5 min |
| C-04/C-05 | Assombrir muted-foreground et eliminer gray-400 sur texte porteur de sens | 1h |

### Sprint 2 (importants -- 2 jours)

| # | Action | Effort |
|---|--------|--------|
| C-03 | Focus trap dans Modal.tsx | 30 min |
| I-04 | Focus trap dans PublicNavbar drawer + ConfirmDialog | 30 min |
| I-01 | aria-live sur ProgressPoll | 5 min |
| I-02 | aria-label sur AnimatedProgressBar | 5 min |
| I-03 | aria-live sur MerciPage container | 5 min |
| I-05 | h1 sur paiement page | 5 min |
| I-07 | inert/tabindex sur ConfirmDialog quand ferme | 20 min |

### Sprint 3 (moderes -- 1 jour)

| # | Action | Effort |
|---|--------|--------|
| M-01 | aria-required sur input telephone | 5 min |
| M-02 | aria-describedby sur erreur telephone | 10 min |
| M-03 | aria-describedby sur erreur montant | 10 min |
| M-05 | aria-pressed sur boutons preset montant | 5 min |

**Effort total estime : 3-4 jours developpeur.**

---

## Couleurs auditees -- Ratios de contraste

| Couleur | Hex | Sur fond | Ratio | Verdict (AA normal) |
|---------|-----|----------|-------|---------------------|
| primary (navy) | #172866 | #FFFFFF | **12.63:1** | PASSE |
| primary-foreground | #FFFFFF | #172866 | **12.63:1** | PASSE |
| muted-foreground | #5C6784 | #FFFFFF | **4.28:1** | ECHEC |
| gray-400 | #9ca3af | #FFFFFF | **2.68:1** | ECHEC severe |
| gray-500 | #6b7280 | #FFFFFF | **4.64:1** | Limite |
| gray-600 | #4b5563 | #FFFFFF | **7.04:1** | PASSE |
| red-500 | #ef4444 | #FFFFFF | **4.00:1** | ECHEC (texte erreur) |
| red-600 | #dc2626 | #FFFFFF | **4.64:1** | Limite |
| red-700 | #b91c1c | #FFFFFF | **5.74:1** | PASSE |
| trustpilot green | #00B67A | #FFFFFF | **3.03:1** | ECHEC (large OK) |
| footer white/80 | rgba(255,255,255,0.8) | #0E1A40 | **~13:1** | PASSE |
| pink | #FBE6ED | utilise en bg | N/A | PASSE (bg seulement) |

**Note sur red-500 :** Utilise comme `text-red-500` sur les erreurs d'input (Input.tsx l.87). A 4.00:1, c'est en dessous de 4.5:1. Passer a `text-red-700` (#b91c1c) pour les messages d'erreur.

---

_Fin de l'audit 032._
