# Audit 040 — Borne anti-blanchiment 50k inclusive + bouton « Participer » proactif

**Date** : 2026-05-03
**Périmètre** : working tree (5 fichiers M + 1 nouveau script `update-admin-pwd.ts`).
**Contexte** : suite à la feature carte bancaire (commits `c80af7e..6cc0010`) et aux follow-ups audit-039, ce dernier batch passe la borne anti-blanchiment de `> 50_000` à `>= 50_000` (décision business 2026-05-03), désactive le bouton « Participer à la cagnotte » tant que le formulaire n'est pas valide, et corrige la régression UX sur les cagnottes désactivées dans le tableau de bord.

---

## Verdict global

Travail **propre et bien ciblé**. Les trois objectifs sont atteints :

1. **Borne `>=`** : cohérente entre `ParticiperForm.tsx`, `orders.ts` et `smoke-test.ts`. Aucun fichier oublié dans le repo principal (les hits restants en `50_000` ou `50000` sont soit non-liés — limite paginée admin/CSV, audit-037 — soit dans `.claude/worktrees/` qui sont des copies indépendantes).
2. **Bouton désactivé** : `canSubmit` correctement mémoïsé, dépendances complètes, `disabled` + `aria-describedby` + hint contextuel bien câblés, pas de second bouton de paiement à mettre à jour (le « fixed bottom CTA bar » du commentaire haut-de-fichier est de la doc obsolète — il n'y a qu'un seul `<button type="submit">` ligne 543).
3. **UX cagnotte désactivée** : sentinel `"errored" | "disabled"` retire le pulse infini, badge « Désactivée » + grayscale + `pointer-events-none` + `aria-disabled` sur le wrapper.

**Aucun bug bloquant détecté.** Quelques points d'a11y et un héritage du bug audit-039 D-2 (anonyme + ≥50k drop encore l'email côté frontend) qui mérite escalation. Détails ci-dessous.

---

## 🟢 Points solides

- **Cohérence frontend ↔ backend sur la borne** : le grep complet (`HIGH_VALUE`, `50_000`, `> 50`, `>= 50`) ne montre aucune occurrence oubliée dans le code de prod. Les deux constantes (`HIGH_VALUE_THRESHOLD` frontend, `HIGH_VALUE_DONATION_THRESHOLD` backend) sont alignées sur `50_000` avec borne inclusive `>=`.
- **Memo `canSubmit` (ParticiperForm.tsx:117-130)** : dépendances `[baseAmount, requiresIdentity, firstName, email]` correctes. `requiresIdentity` étant lui-même dérivé de `totalAmount = baseAmount + voluntaryAmount`, il bouge bien quand l'utilisateur toggle `voluntaryEnabled`. Pas de stale-state.
- **Smoke-test 23 ajusté à `amount: 50000`** : teste explicitement la borne exacte (et plus le confort `60000`). Décision business validée par un test, c'est exactement ce qu'on veut.
- **Smoke-test 25 (donateur anonyme ≥50k → audit trail)** continue à fonctionner : il bypass la validation Zod (insertion directe via `prisma.order.create`) donc la nouvelle borne `>=` n'introduit aucune régression. `dispatch.ts:116-117/207-208` rend toujours `donorDisplayName` + `wasAnonymous` correctement.
- **Email regex `EMAIL_RE`** : testé sur 15 cas-bord (cf. table ci-dessous). Comportement aligné sur `z.string().email()` Zod (suffisamment permissif, pas plus strict que le backend → pas de cas où le bouton s'active puis échoue côté API pour cause de regex divergent).
- **`pointer-events-none` + `aria-disabled` sur le wrapper inactive card** : empêche le clic souris et signale l'état aux AT compatibles. Le sentinel `progress` est typé `ProgressPayload | "errored" | "disabled" | null` proprement.
- **`update-admin-pwd.ts`** : script court (24 lignes), pas de log du mot de passe en clair (uniquement `id/email/role/isActive/name` via `select`). Hash bcrypt à 12 rounds (cohérent avec `auth.ts`). Validation des args présente (exit 2 sur missing).

### Table d'évaluation `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/`

| Input | Résultat | Attendu |
|---|---|---|
| `a@b.c` | PASS | PASS (Zod laxiste) |
| `a@b` | FAIL | FAIL ✓ |
| `@b.com` | FAIL | FAIL ✓ |
| `a@.com` | FAIL | FAIL ✓ |
| `a@b.` | FAIL | FAIL ✓ |
| `a@b..c` | PASS | edge non-bloquant |
| `a b@b.com` | FAIL | FAIL ✓ |
| `a@b c.com` | FAIL | FAIL ✓ |
| `a@b@c.com` | FAIL | FAIL ✓ |
| `user.name+tag@domain.co.uk` | PASS | PASS ✓ |
| `  test@x.com  ` (untrimmed) | FAIL | s'aligne sur le `.trim()` côté memo (ligne 125) ✓ |
| `test@@x.com` | FAIL | FAIL ✓ |

→ regex frontend correctement aligné sur Zod backend. Aucune divergence connue.

---

## 🟡 Points d'attention

### YA-1 — `aria-describedby` sur wrapper, pas sur le `<a>` interne — sévérité **basse**

**Fichier** : `src/app/(authed)/tableau-de-bord/_ClientCampaignCard.tsx:88-95`

`aria-disabled="true"` est posé sur le `<div>` wrapper, mais le `<a>` rendu par `<CampaignCard linkVariant="creator">` reste focusable au clavier. `pointer-events-none` bloque souris/touch mais **pas la navigation Tab**. Un utilisateur clavier peut tabuler vers une cagnotte « Désactivée » et l'activer avec Enter (qui contourne `pointer-events-none`).

**Fix proposé** (P2) : passer `disabled` au composant `CampaignCard` pour qu'il rende `tabIndex={-1}` + `aria-disabled="true"` + `onClick={(e) => e.preventDefault()}` sur le `<a>` interne, ou utiliser un `<div>` au lieu d'un `<a>` quand `disabled`. Pas bloquant en v1 (target market = mobile-first, peu de users clavier sur ce parcours).

### YA-2 — Anonyme + ≥50k drop toujours l'email côté frontend — héritage audit-039 D-2 — sévérité **moyenne**

**Fichier** : `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:181-185`

```ts
customerName: isAnonymous && !requiresIdentity ? "" : trimmedName,
customerEmail:
  isAnonymous && !requiresIdentity
    ? undefined
    : trimmedEmail || undefined,
```

Bonne nouvelle : la condition `isAnonymous && !requiresIdentity` signifie que **dès que `requiresIdentity` est vrai** (≥50k), l'email **est** envoyé même si `isAnonymous=true`. C'est la résolution de la « boucle infinie » d'erreur signalée dans audit-039 D-2.

**Mais** : les champs nom/email portent toujours `disabled={fieldsDisabled}` où `fieldsDisabled = isAnonymous && !requiresIdentity` (ligne 354). Donc quand l'utilisateur saisit 60k puis coche « anonyme », les champs **restent éditables** (✓), mais le commentaire UX du commit Phase 6 (« le donateur peut quand même cocher anonyme : ses infos sont stockées mais non affichées ») n'est pas explicité dans la UI. Le donateur ne voit pas qu'**il a quand même rempli son email** alors qu'il croit être anonyme.

**Fix proposé** (P2) : sous le toggle anonyme, ajouter un sous-titre conditionnel quand `requiresIdentity && isAnonymous` :
> « Anti-blanchiment : votre email reste collecté même en mode anonyme. Il ne sera pas affiché publiquement. »

C'est la suite logique de la résolution audit-039 — le code est bon, la UI doit le verbaliser.

### YA-3 — Commentaire « fixed bottom CTA bar » obsolète — sévérité **très basse**

**Fichier** : `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:67-79` (header doc)

> « Below lg the summary moves under the form and a fixed bottom CTA bar surfaces Total + "Procéder au paiement" so the donor never loses the payment button. »

Vérifié : il n'y a plus qu'**un seul** `<button type="submit">` (ligne 543). Le bouton ligne 254 est `type="button"` (preset amount). La barre CTA fixe a probablement été refondue mais le commentaire de tête n'a pas été mis à jour. **Pas de bug** (rien à `disabled` en plus), juste de la dette doc.

**Fix proposé** (P3) : retirer la phrase ou la corriger pour décrire le layout actuel (le sticky right-column reflowe sous le formulaire en mobile).

### YA-4 — Documentation reste sur `> 50 000` — sévérité **basse**

**Fichiers** :
- `audits/audit-039-card-feature-implementation.md:57-78, 172, 188` : références `> 50_000` qui sont maintenant fausses (la borne est passée `>=`). Acceptable car c'est un audit historique daté.
- Pas d'autres docs concernées (vérifié `docs/handoff/` : vide ou non-existant ; `.claude/worktrees/` : copies isolées hors scope).

**Fix proposé** (P3) : ajouter un addendum en tête d'audit-039 « Résolution 2026-05-03 : borne passée à `>=` (audit 040) » pour le futur lecteur. Non-bloquant.

### YA-5 — Hint contextuel dépend strictement de `!submitting` — sévérité **très basse**

**Fichier** : `ParticiperForm.tsx:561-571`

Quand `submitting=true`, le bouton devient `disabled` (transition normale) **et** le hint disparaît. Si la submission échoue (network error) et que le code repasse `submitting=false`, le hint réapparaît brièvement. C'est un flicker mineur, pas un bug.

**Note a11y** : `aria-describedby` est `undefined` quand `submitting=true` même si le bouton est disabled. Un screen reader perd alors l'info contextuelle pendant le submit. Acceptable car le state submit est temporaire (qq centaines de ms vers `/paiement`).

### YA-6 — `progress === "errored"` silencieux — sévérité **très basse**

**Fichier** : `_ClientCampaignCard.tsx:67-72`

Quand le fetch `/progress` échoue (timeout, 401 stale cookie, 500), la card affiche `0 / goal` avec `donorCount=0`. Le creator ne sait pas que c'est une erreur réseau plutôt qu'une cagnotte vide.

**Acceptable** dans le creator dashboard (rare, pas critique), mais on pourrait en option afficher un petit indicateur d'erreur (ex. icône ⚠ discrète) au lieu d'un faux 0. **P3, optionnel.**

---

## 🔴 Bugs critiques

**Aucun.** Le batch est sain.

---

## 📋 Recommandations finales (priorisées)

### P0 — bloquant
*(rien)*

### P1 — à faire avant prochain merge
*(rien)*

### P2 — à planifier (UX/a11y)
1. **YA-2** — ajouter le sous-titre « anti-blanchiment : email collecté même en mode anonyme » sous le toggle quand `requiresIdentity && isAnonymous`. Cohérence UX avec la décision audit-039.
2. **YA-1** — propager `disabled` dans `<CampaignCard>` (ou utiliser `<div>` non-link) pour les cagnottes désactivées, afin de neutraliser la navigation clavier en plus de la souris.

### P3 — dette doc / nice-to-have
3. **YA-3** — corriger le commentaire « fixed bottom CTA bar » en tête de `ParticiperForm.tsx`.
4. **YA-4** — ajouter un addendum daté à `audit-039-card-feature-implementation.md` pointant vers cet audit-040.
5. **YA-6** — afficher un indicateur d'erreur visible quand `progress === "errored"` plutôt qu'un faux `0/goal`.

---

## Couverture des sections demandées

| Section | Statut |
|---|---|
| A — Borne 50k inclusive (`>=`) | ✅ tout cohérent |
| B — Bouton « Participer » disabled | ✅ propre, un seul submit, hint OK |
| C — Email regex | ✅ aligné Zod, 15 cas testés |
| D — UI feedback désactivée (dashboard) | ✅ avec réserve a11y clavier (YA-1) |
| E — Régression / cohérence globale | ✅ smoke 23/25, dispatch.ts intact, doc historique seule à mettre à jour |
| Script `update-admin-pwd.ts` | ✅ sécurité OK, pas de log password |

---

**Conclusion** : merge possible en l'état. Les deux items P2 (YA-1 a11y clavier, YA-2 sous-titre anonyme+50k) peuvent être traités en suivant dans un mini-batch UX dédié — ils ne bloquent pas la décision business du jour.
