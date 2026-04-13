# Deploy Checklist — Izy Store

> Ce fichier contient tout ce qu'il faut faire avant et pendant le déploiement en production.
> Mis à jour au fur et à mesure du développement.

---

## 🔴 Variables d'environnement (BLOQUANT)

Ces variables doivent être configurées dans l'environnement de production (Railway, Vercel, etc.) :

### Backend (.env production)

- [ ] `NODE_ENV=production` — Active les cookies secure, désactive /api/dev, réduit les logs
- [ ] `FRONTEND_URL=https://izy.store` — Utilisé dans 19 emails + redirections post-paiement
- [ ] `BACKEND_URL=https://api.izy.store` — URLs images uploadées + webhooks Telegram
- [ ] `BICTORYS_REDIRECT_URL=https://api.izy.store` — Redirection post-paiement Bictorys (le backend redirige ensuite vers le frontend via /store/:slug/pending, /success, /error)
- [ ] `ALLOWED_ORIGINS=https://izy.store,https://www.izy.store` — CORS multi-origin
- [ ] `TELEGRAM_WEBHOOK_SECRET=<générer avec openssl rand -hex 32>` — Vérification webhooks Telegram
- [ ] `BICTORYS_MERCHANT_SECRET_CODE=<code production>` — Vérifier que ce n'est plus "1234"

### Variables déjà OK (vérifier quand même)

- [x] `DATABASE_URL` — Neon PostgreSQL configuré
- [x] `JWT_SECRET` — 64 bytes hex
- [x] `RESEND_API_KEY` — Clé Resend pour izy.store
- [x] `EMAIL_FROM=noreply@izy.store` — Domaine izy.store
- [x] `BICTORYS_API_KEY` / `BICTORYS_PRIVATE_KEY` / `BICTORYS_WEBHOOK_SECRET` — Vérifier mode production
- [x] `R2_*` — Cloudflare R2 configuré
- [x] `ENCRYPTION_KEY` — AES-256 pour tokens Telegram
- [x] `UPSTASH_REDIS_*` — Redis connecté
- [x] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth configuré

---

## 🔴 Pages manquantes (BLOQUANT)

- [x] **Page `/unsubscribe`** — Créée avec endpoint API `POST /api/auth/unsubscribe` + champ `emailUnsubscribed` en DB.

---

## 🔴 Infrastructure (BLOQUANT)

- [ ] **DNS** : Configurer `izy.store` sur Vercel (frontend) + domaine API sur Railway (backend)
- [ ] **Bictorys** : Vérifier que le compte marchand est en **mode production** (pas sandbox)
- [ ] **R2** : Vérifier que le bucket Cloudflare R2 est accessible en production
- [ ] **Redis** : Vérifier que Upstash Redis est connecté (rate limiting + queues email)
- [ ] **Admin** : Exécuter `npx tsx src/scripts/seedAdmin.ts` pour créer le SUPER_ADMIN

---

## 🟡 Email (IMPORTANT)

- [ ] **SPF/DKIM** : Configurer les enregistrements DNS pour `izy.store` dans Resend (deliverability)
- [ ] **Tester** : Envoyer un email de test et vérifier qu'il n'arrive pas en spam
- [x] Template brandé Izy Store implémenté (wrapper automatique)
- [x] Version texte brut auto-générée
- [x] Header List-Unsubscribe RFC 2369

---

## 🟡 Sécurité (IMPORTANT)

- [ ] **Vérifier** que `/api/dev` n'est PAS accessible en production (dépend de `NODE_ENV=production`)
- [ ] **Vérifier** que les cookies ont le flag `secure` en production
- [x] **`backend/.gitignore`** créé avec : `node_modules/`, `dist/`, `src/generated/`, `.env`
- [x] Passwords bcrypt 12 rounds
- [x] JWT cookies httpOnly + secure (en prod) + sameSite
- [x] CSRF double-submit cookie sur toutes les routes mutation
- [x] XSS protection (escapeHtml dans les emails)
- [x] Webhook HMAC SHA-256 + replay protection
- [x] Rate limiting Redis sur tous les endpoints
- [x] Helmet headers HTTP
- [x] Transactions Serializable (bookings, withdrawals, payments)

---

## 🟢 Déjà validé

- [x] Frontend TypeScript : 0 erreurs
- [x] Next.js build : succès
- [x] Backend : démarre sans erreurs
- [x] Prisma schema synchronisé avec la DB
- [x] 60+ index DB bien placés
- [x] Zod validation sur tous les inputs API
- [x] Logging structuré (prod-safe, redaction)
- [x] 8 types de blocs fonctionnels
- [x] Paiement Bictorys (Orange Money + Wave)
- [x] Retrait multi-pays (SN, CI, ML, GN, TG, CM)
- [x] KYC gate avant retrait
- [x] Analytics (vues, clics, revenus, sources)
- [x] Admin dashboard complet
- [x] Communautés Telegram avec billing automatique

---

## Commandes de déploiement

```bash
# Backend (Railway)
# 1. Configurer toutes les env vars ci-dessus
# 2. Déployer
# 3. Exécuter le seed admin :
npx tsx src/scripts/seedAdmin.ts

# Frontend (Vercel)
# 1. Configurer NEXT_PUBLIC_API_URL = URL du backend
# 2. Déployer

# Base de données
# Si première fois :
npx prisma db push
# Sinon (migration) :
npx prisma migrate deploy
```

---

*Dernière mise à jour : 3 mars 2026*
