# Audit 032 — UX Parcours Complet (Donateur + Createur)

**Date :** 2026-04-16
**Auditeur :** Claude (UX flow audit)
**Perimetre :** Tous les parcours utilisateur frontend (public + authed)
**Fichiers examines :** ~60 fichiers TSX/TS dans `src/app/`, `src/components/`, `src/lib/`

---

## Resume executif

Le parcours donateur public est **complet et bien pense** : discovery -> detail -> participer -> paiement -> merci, avec polling, gestion in-app browser, et etats d'erreur. Le parcours createur est egalement complet : inscription -> verification email -> dashboard -> creation wizard 3 etapes -> gestion -> retraits.

Les issues identifiees sont principalement des **lacunes UX** (pas de blocages critiques de flux) et quelques **edge cases non geres**.

---

## DONATEUR — Parcours public

### 1. Discovery flow (Homepage -> Cagnottes -> Detail)

**Etat : Bien implemente**

- Homepage : Hero avec CTA clair, section "Cagnottes du moment" (6 featured, tri popular), Features, FAQ
- `/cagnottes` : Recherche debounced (300ms), filtres festive/solidaire, pagination, skeletons de chargement, empty state avec CTA reset
- Transition fluide vers `/c/[slug]`

#### HIGH-01 : Pas de CTA "Decouvrir les cagnottes" visible en hero pour les donateurs

**Fichier :** `src/app/(public)/_home/_Hero.tsx:44-50`
**Probleme :** Le CTA principal du Hero est "Creer ma cagnotte" (pour les createurs). Les donateurs (90% mobile, cible principale) n'ont pas de CTA immediat pour parcourir les cagnottes existantes. Ils doivent scroller jusqu'a la section featured ou utiliser la navbar.
**Impact :** Perte de conversion donateur — le premier ecran ne parle qu'aux createurs.
**Fix :** Ajouter un CTA secondaire sous le bouton principal :
```tsx
<Link href="/cagnottes" className="...text-primary underline...">
  Decouvrir les cagnottes
</Link>
```

### 2. Page detail cagnotte (`/c/[slug]`)

**Etat : Complet et premium**

- Progress bar animee avec polling 20s (`ProgressPoll`)
- Social proof : participants (10 recents), montant, nombre de donateurs
- Share : WhatsApp, Facebook, Twitter, Telegram, copier lien, navigator.share
- Cagnotte privee : banner jaune
- Cagnotte cloturee : CTA remplace par "Cagnotte cloturee"
- Description : rich-text sanitise avec `normalizeLegacyDescription` + `dangerouslySetInnerHTML` (securise via `sanitize-html`)
- OG images generees dynamiquement

#### MEDIUM-01 : Pas de gestion de la cagnotte expiree par date de fin

**Fichier :** `src/app/(public)/c/[slug]/page.tsx:191-193`
**Probleme :** Le code verifie `cagnotte.status === "closed"` mais ne compare pas `endDate` a la date actuelle. Si la date de fin est passee mais le backend n'a pas encore marque la cagnotte comme closed (pas de cron pour ca), le bouton "Je participe" reste actif.
**Impact :** Un donateur pourrait tenter un paiement sur une cagnotte techniquement expiree.
**Fix :** Ajouter un check cote frontend :
```tsx
const isExpired = cagnotte.endDate && new Date(cagnotte.endDate) < new Date();
const canParticipate = !isClosed && !isExpired;
```

#### LOW-01 : "Fonds verses en 48h" — pluriel grammatical

**Fichier :** `src/app/(public)/c/[slug]/page.tsx:465-470`
**Note :** "Versement sur Wave ou Orange Money — jours ouvres." La phrase est correcte mais le "jours ouvres" sans article peut sembler trunce. Minor.

### 3. Formulaire de participation (`/c/[slug]/participer`)

**Etat : Excellent UX**

- 3 etapes numerotees : Montant / Infos / Message
- Montants suggeres (3 presets) + montant libre
- Contribution volontaire 3% (opt-out, pas opt-in) avec toggle clair
- Recap sticky a droite (desktop) / en bas (mobile)
- Validation : minimum 500 FCFA, maximum 10M FCFA
- Anonymous toggle masque prenom/email
- Message prive toggle

#### HIGH-02 : Contribution volontaire activee par defaut (dark pattern potentiel)

**Fichier :** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:76-78`
```tsx
const [voluntaryEnabled, setVoluntaryEnabled] = React.useState<boolean>(true);
```
**Probleme :** La contribution volontaire de 3% est activee par defaut. C'est un pattern UX contestable ("dark pattern") dans le contexte d'une plateforme solidaire au Senegal. Les utilisateurs mobiles (90% de la cible) pourraient ne pas remarquer cette checkbox et payer plus que prevu.
**Impact :** Risque de perte de confiance si des donateurs decouvrent apres coup qu'ils ont paye 3% de plus.
**Recommandation :** Decision produit a trancher. Si c'est intentionnel, le label devrait etre plus explicite : "3% de ta participation sera verse a cagnotte.sn pour maintenir la plateforme" avec le montant exact affiche.
**Note :** Le montant exact EST affiche (`+ 150 FCFA` par exemple), donc c'est transparent, mais le defaut `true` reste un choix a documenter.

#### MEDIUM-02 : Pas de mobile bottom CTA bar visible

**Fichier :** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx`
**Probleme :** Le commentaire en header mentionne "Below lg the summary moves under the form and a fixed bottom CTA bar surfaces Total + Proceder au paiement" mais je ne vois PAS de fixed bottom bar implementee dans le code. Le bouton submit est dans l'aside qui se positionne sous le formulaire sur mobile. Sur mobile, le donateur doit scroller tout en bas pour trouver le bouton.
**Impact :** Sur mobile (90% des utilisateurs), le CTA de paiement est potentiellement hors ecran si le formulaire est long.
**Fix :** Implementer la fixed bottom CTA bar mentionnee dans le commentaire :
```tsx
{/* Fixed mobile CTA bar */}
<div className="fixed bottom-0 inset-x-0 z-40 border-t bg-white p-4 shadow-lg lg:hidden">
  <div className="flex items-center justify-between">
    <span className="font-bold">{formatPrice(totalAmount)}</span>
    <button type="submit">Participer</button>
  </div>
</div>
```

### 4. Page paiement (`/c/[slug]/paiement`)

**Etat : Complet avec gestion in-app browser**

- Session stash : donnees transferees via `sessionStorage`, redirect vers `/participer` si manquant
- 3 operateurs : Wave, Orange Money, Maxit
- Telephone avec prefixe +221 et validation
- Gestion in-app browser : TikTok (redirect direct), Meta (carte ouvrir/partager/copier)
- QR code Wave desktop
- Circuit breaker 503 gere
- Rate limit 429 gere
- Polling en attente de confirmation

#### HIGH-03 : Session storage bloque = flux casse sans recovery

**Fichier :** `src/app/(public)/c/[slug]/paiement/page.tsx:169-185`
**Probleme :** Si `sessionStorage` est bloque (navigation privee Safari, certains in-app browsers), le redirect vers `/participer` se declenche en boucle. Le donateur reste coince.
**Impact :** Flux completement casse pour une portion non negligeable d'utilisateurs mobile.
**Fix :** Utiliser un fallback URL params ou cookie pour transporter les donnees critiques (montant, slug) en cas de sessionStorage indisponible. Alternative : detecter l'absence de sessionStorage et afficher un message d'erreur explicite avec un lien direct.

#### MEDIUM-03 : Pas de validation du format telephone

**Fichier :** `src/app/(public)/c/[slug]/paiement/page.tsx:258-273`
**Probleme :** La validation se limite a `!phoneLocal.trim()`. Aucune verification du format senegalais (7X XXX XX XX — 9 chiffres commencant par 7). Un utilisateur peut saisir "123" et le paiement sera soumis au backend.
**Impact :** Le backend rejette probablement, mais l'utilisateur recoit un message d'erreur generique au lieu d'une validation inline claire.
**Fix :**
```tsx
const SN_PHONE_REGEX = /^7[05-8]\d{7}$/;
if (!SN_PHONE_REGEX.test(phoneLocal.replace(/\s/g, ""))) {
  setErrors({ phone: "Numero invalide. Format : 7X XXX XX XX" });
  return;
}
```

### 5. Page merci (`/c/[slug]/merci`)

**Etat : Complet et bien pense**

- 5 etats : PENDING (polling), PAID (succes), FAILED, EXPIRED, TIMEOUT
- Polling borne : 3s x 40 = 2 minutes max
- Pause quand onglet invisible
- TIMEOUT : affiche la reference + email support
- PAID : confirmation montant + message de remerciement du createur + code confirmation + ShareSheet
- Recovery : bouton "Rever le paiement" + retour a la cagnotte
- Reference hydratee depuis URL ou sessionStorage

#### LOW-02 : Le compteur de tentatives est affiche au donateur

**Fichier :** `src/app/(public)/c/[slug]/merci/page.tsx:153-156`
```tsx
<p className="text-sm text-muted-foreground">
  Tentative {Math.min(attempts + 1, MAX_POLLS)}/{MAX_POLLS}
</p>
```
**Probleme :** Afficher "Tentative 15/40" est anxiogene pour un donateur qui vient de payer. Un simple spinner avec "Verification en cours..." serait plus rassurant.
**Impact :** UX anxiogene, pas de perte fonctionnelle.

---

## CREATEUR — Parcours authentifie

### 6. Onboarding (Inscription -> Verification -> Dashboard)

**Etat : Complet**

- Inscription : Prenom + Nom + Email + MDP + CGU
- Slug auto-genere avec preview live
- Verification email : 6 inputs individuels avec auto-advance, paste, 60s cooldown
- Redirect vers dashboard apres verification
- Google OAuth supporte (derriere feature flag `FEATURE_SOCIAL_AUTH`)
- Pattern "Google-first collapsible" : email cache derriere un bouton secondaire

#### MEDIUM-04 : Pas de validation force du mot de passe cote client

**Fichier :** `src/app/(auth)/inscription/page.tsx:226-268`
**Probleme :** Le champ mot de passe a `minLength={8}` et un `helper` text, mais la validation `onSubmit` ne verifie pas la longueur. Le formulaire est `noValidate`. Si le backend rejette, l'utilisateur recoit un message generique.
**Impact :** Mauvaise UX — le feedback devrait etre inline avant soumission.
**Fix :** Ajouter dans `onSubmit` :
```tsx
if (password.length < 8) {
  setError("Le mot de passe doit contenir au moins 8 caracteres.");
  return;
}
```

#### LOW-03 : Email non pre-rempli apres redirect Google echouee

**Fichier :** `src/app/(auth)/inscription/page.tsx:52-65`
**Probleme :** Apres une erreur Google OAuth (`?error=google_failed`), le toast s'affiche mais les champs restent vides. Si l'email du compte Google etait connu, il pourrait etre pre-rempli.
**Note :** Mineur — le flow fonctionne, l'UX est juste un peu froide.

### 7. Dashboard (`/tableau-de-bord`)

**Etat : Complet**

- Empty state avec CTA "Creer ma cagnotte"
- KPIs : Total collecte, Nombre de donateurs, Nombre de cagnottes
- Liste des 5 cagnottes recentes avec ClientCampaignCard (hydratation client du progress)
- Welcome message personnalise

#### MEDIUM-05 : Lien "Voir tout" pointe vers `/cagnottes` (public) au lieu de la liste createur

**Fichier :** `src/app/(authed)/tableau-de-bord/page.tsx:167-170`
```tsx
<a href="/cagnottes" className="...">
  {ACTIONS.voirTout}
</a>
```
**Probleme :** Ce lien emmene le createur vers la page publique de toutes les cagnottes, pas vers une vue filtree de SES cagnottes. Il n'existe pas de `/tableau-de-bord/cagnottes` listant toutes les cagnottes du createur.
**Impact :** Confusing — le createur quitte son espace prive pour atterrir sur le listing public.
**Fix :** Soit creer une page `/tableau-de-bord/cagnottes` listant toutes les cagnottes du createur, soit masquer le lien si < 5 cagnottes.

### 8. Creation de cagnotte (Wizard 3 etapes)

**Etat : Complet et bien structure**

- Picker : Solidaire (6%) vs Festive (8%) avec commission affichee
- Etape 1 : Titre + Cause/Occasion + Beneficiaire + Objectif (min 1000 FCFA)
- Etape 2 : Cover + Gallery + Description (RichText) + Message de remerciement + Date fin
- Etape 3 : Visibilite + Hide amount/donors + CGU + Publier
- Succes : Confetti + Preview card + URL copiable + ShareSheet
- Draft persiste via `useWizardDraft` (sessionStorage)
- Step guard : etape 2/3 redirige vers etape 1 si draft incomplet

#### LOW-04 : Pas de retour possible depuis la page succes vers le detail createur

**Fichier :** `src/app/(authed)/tableau-de-bord/nouvelle/succes/page.tsx:133-139`
**Probleme :** Le seul CTA est "Retour au tableau de bord". Il manque un lien direct vers `/tableau-de-bord/cagnottes/[slug]` pour que le createur puisse immediatement voir sa cagnotte dans le dashboard.
**Fix :** Ajouter un second CTA :
```tsx
<Link href={`/tableau-de-bord/cagnottes/${cagnotte.slug}`}>
  Voir ma cagnotte
</Link>
```

### 9. Gestion de cagnotte (`/tableau-de-bord/cagnottes/[slug]`)

**Etat : Complet et premium**

- Hero banner avec cover, status badge (En ligne / Cloturee), subtype badge
- KPIs : Collecte + Progress bar, Participants, Progression %
- Fonds disponibles avec CTA retrait (gate KYC)
- Participations recentes (5) avec messages
- Share link + Copier
- Visibilite affichee + lien modifier
- Danger zone : cloturer la cagnotte
- Mobile sticky action bar
- Owner gate : `notFound()` si pas proprietaire (pas de 403 leak)

#### INFO-01 : La page stats existe mais n'est pas liee depuis le detail

**Fichier :** `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx:442-448`
**Observation :** Le lien "Voir tout" pointe vers `/stats` avec le compteur de participations. La page stats (`stats/page.tsx`) existe. OK — c'est lie.

### 10. Edition de cagnotte (`/modifier`)

**Etat : Complet**

- Tous les champs editables : titre, description (RichText), couverture, gallery, objectif, date fin, visibilite, message de remerciement, montants suggeres, hide toggles
- Slug NON editable (v1 intentionnel)
- Subtype/occasion/cause NON editables (preserve via spread `...safeConfig`)
- Cover upload via multipart direct au backend

### 11. Notifications (`/notifications`)

**Etat : Complet**

- 9 types de notifications (donation recue, milestone, ending soon, cagnotte terminee, message donateur, payout complete/failed, KYC approved/rejected)
- Tabs All/Unread avec compteurs
- Mark-read au clic
- Cursor-based pagination
- Empty state

### 12. Retraits (`/retraits`)

**Etat : Complet avec 3 gates**

- Gate 1 : KYC non approuve -> CTA vers `/profil/kyc` + checklist progression
- Gate 2 : PIN non configure -> CTA vers `/profil/securite`
- Gate 3 : Compte bloque -> CTA support
- Montant avec chip "Max" + summary avec frais a 0
- Operateurs : Wave / Orange Money (pas Maxit pour les retraits)
- Etape PIN -> Confirmation -> Succes
- Multi-step via `useWithdrawalDraft` (sessionStorage)

#### MEDIUM-06 : Pas de minimum de retrait affiche clairement

**Fichier :** `src/app/(authed)/retraits/_AmountStep.tsx:161-167`
**Probleme :** Le helper text mentionne `WITHDRAWAL_LABELS.amountMin` mais la validation est dans `validateWithdrawalDraft` (schema). Si le montant est trop bas, l'erreur arrive via toast au submit. Pas de feedback inline.
**Impact :** UX sub-optimale — le donateur ne sait pas le minimum avant de soumettre.

### 13. Profil (`/profil`)

**Etat : Complet**

- Informations personnelles (nom, email, avatar, telephone)
- Coordonnees bancaires (payout phone + provider)
- KYC (4 etats : none/pending/approved/rejected)
- Securite : changement mot de passe (PUT) + PIN 4 chiffres
- Preferences de notification

### 14. Participations (`/participations`)

**Etat : Complet**

- Liste des donations du createur avec cover, date, montant, statut
- Desktop : table, Mobile : cards
- Pagination

---

## EMPTY STATES

| Ecran | Empty state | Verdict |
|---|---|---|
| Dashboard (0 cagnottes) | EmptyState + CTA creer | OK |
| Cagnottes listing (0 resultats) | EmptyState + CTA reset filtres | OK |
| Detail participants (0) | "En attente du premier soutien" | OK |
| Notifications (0) | EmptyState + icone BellOff | OK |
| Homepage featured (0) | Message dans card arrondie | OK |
| Participations (0) | Gere par le serveur (redirect si 0) | A VERIFIER |

---

## ERROR RECOVERY

| Scenario | Gere ? | Fichier |
|---|---|---|
| Bictorys down (503) | Oui — message circuit breaker | `paiement/page.tsx:369` |
| Rate limit (429) | Oui — message explicite | `paiement/page.tsx:367` |
| Session expiree mid-flow | Oui — `api()` auto-refresh 401 | `src/lib/api.ts` |
| Network error POST donation | Oui — catch generique | `paiement/page.tsx:371-374` |
| sessionStorage bloque | Partiellement — redirect loop possible | **HIGH-03** |
| Upload cover echoue | Oui — toast + reset | `_EditForm.tsx:163` |
| Backend down pendant SSR | Oui — `return null` + `notFound()` | Toutes les pages SSR |

---

## RECAPITULATIF

### CRITICAL (0)
Aucun flux casse.

### HIGH (3)
| ID | Titre | Fichier |
|---|---|---|
| HIGH-01 | Pas de CTA donateur en hero | `_Hero.tsx` |
| HIGH-02 | Contribution volontaire activee par defaut | `ParticiperForm.tsx:76` |
| HIGH-03 | sessionStorage bloque = boucle redirect | `paiement/page.tsx:169` |

### MEDIUM (6)
| ID | Titre | Fichier |
|---|---|---|
| MEDIUM-01 | Cagnotte expiree par date non bloquee | `c/[slug]/page.tsx` |
| MEDIUM-02 | Bottom CTA bar mobile non implementee | `ParticiperForm.tsx` |
| MEDIUM-03 | Pas de validation format telephone SN | `paiement/page.tsx:258` |
| MEDIUM-04 | Pas de validation force MDP client | `inscription/page.tsx` |
| MEDIUM-05 | "Voir tout" pointe vers listing public | `tableau-de-bord/page.tsx:167` |
| MEDIUM-06 | Minimum retrait pas affiche inline | `_AmountStep.tsx` |

### LOW (4)
| ID | Titre | Fichier |
|---|---|---|
| LOW-01 | "Jours ouvres" phrase tronquee | `c/[slug]/page.tsx:470` |
| LOW-02 | Compteur tentatives anxiogene | `merci/page.tsx:153` |
| LOW-03 | Email non pre-rempli apres erreur Google | `inscription/page.tsx` |
| LOW-04 | Pas de lien detail depuis succes creation | `succes/page.tsx` |

### INFO (1)
| ID | Titre |
|---|---|
| INFO-01 | Page stats correctement liee depuis le detail |

---

## Points forts du parcours

1. **Sanitization XSS** : `normalizeLegacyDescription` via `sanitize-html` appliquee partout ou `dangerouslySetInnerHTML` est utilise (defense in depth)
2. **In-app browser** : Gestion sophistiquee TikTok/Meta avec 3 scenarios (redirect direct, carte ouvrir/partager/copier, QR code)
3. **Polling borne** : Merci page + Paiement page ont des limites 2min avec pause tab invisible
4. **Owner gate** : Le detail createur retourne `notFound()` au lieu de 403 (pas de leak d'existence)
5. **Draft persistence** : Wizard creation + withdrawal utilisent sessionStorage avec hydration propre
6. **Empty states** : Couverts partout avec messages en francais et CTAs pertinents
7. **Withdrawal gates** : 3 portes (KYC + PIN + blocked) avec checklist de progression
8. **Commission transparente** : Affichee dans le picker de type (8% festive / 6% solidaire)
