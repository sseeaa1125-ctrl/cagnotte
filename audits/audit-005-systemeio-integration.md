# Audit 005 — Intégration Systeme.io : connexion impossible

**Date** : 22 mars 2026  
**Sévérité** : Critique  
**Statut** : ✅ Corrigé

---

## Symptôme rapporté

Un utilisateur essaie de connecter son Systeme.io mais "rien ne se passe". Pas d'erreur, pas de feedback.

## Bugs identifiés

### 1. CRITIQUE — 0 tags = impossible de connecter (silent failure)
- **Fichier** : `src/app/dashboard/settings/integrations/page.tsx`
- **Cause** : Le bouton "Connecter", le sélecteur de sync et les infos formations étaient tous conditionnés par `lists.length > 0`. Systeme.io utilise les **tags** comme "listes". Si un utilisateur n'a aucun tag → `lists` vide → UI bloquée.
- **Comportement** : L'utilisateur clique "Vérifier la clé", la validation passe (API key correcte), mais le bouton "Vérifier la clé" réapparaît sans aucun feedback. Aucune indication de succès ou d'erreur.
- **Fix** : Ajout d'un état `keyValidated`. Le bouton "Connecter" et les options de sync s'affichent dès que la clé est validée, même sans tags.

### 2. Pas de feedback après validation réussie
- **Cause** : Aucun indicateur visuel de succès après la vérification de la clé API.
- **Fix** : Ajout d'un badge vert "✓ Clé API valide" + message informatif quand 0 tags trouvés ("Les contacts seront ajoutés sans tag").

### 3. Tag ID envoyé comme tag name
- **Fichier** : `backend/src/lib/email-marketing.ts` → `systemeioAddContact()`
- **Cause** : `allTags.push({ name: tagId })` envoyait l'ID numérique du tag (ex: `"12345"`) au lieu du nom du tag. L'API Systeme.io attend `{ name: "nom_du_tag" }` lors de la création de contacts.
- **Fix** : Le frontend envoie maintenant le **nom du tag** (pas l'ID) comme `listId` lors de la connexion. Le code backend `{ name: tagId }` reçoit donc le bon nom.

### 4. Header Content-Type inutile sur GET
- **Fichier** : `backend/src/lib/email-marketing.ts` → `systemeioFetchLists()`
- **Cause** : `Content-Type: application/json` envoyé sur une requête GET, ce qui est non-standard et peut être rejeté par certaines APIs.
- **Fix** : Supprimé le header Content-Type sur le GET `/api/tags`.

## Corrections appliquées

### Frontend (`integrations/page.tsx`)
- Ajout état `keyValidated` (boolean)
- `handleFetchLists` : set `keyValidated = true` on success, `false` on error
- Badge vert "Clé API valide" affiché après validation
- Message informatif si 0 tags (Systeme.io) ou 0 listes (Brevo)
- Bouton "Connecter", sync events, formations info → conditionnés par `keyValidated` (pas `lists.length > 0`)
- `handleConnect` : pour Systeme.io, lookup du nom du tag depuis la liste pour l'envoyer comme `listId`
- Reset de `keyValidated` sur changement de provider, d'outil, ou après connexion réussie

### Backend (`email-marketing.ts`)
- `systemeioFetchLists` : meilleur message d'erreur 401/403, logging du nombre de tags trouvés
- Suppression du header `Content-Type` sur les requêtes GET
- Logging d'erreur avec le body de la réponse en cas d'échec HTTP

## Vérification

1. ✅ Clé API valide + tags → affiche tags + bouton connecter
2. ✅ Clé API valide + 0 tags → affiche "Clé valide" + message + bouton connecter
3. ✅ Clé API invalide → affiche message d'erreur rouge
4. ✅ Connexion réussie → toast + badge "Connecté"
5. ✅ Tag name envoyé correctement à l'API Systeme.io (pas l'ID)
