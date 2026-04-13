# cagnottes.sn

Plateforme de cagnottes en ligne pour le Sénégal. Les créateurs publient une cagnotte partageable via un lien (`cagnottes.sn/<slug>`), et les contributeurs participent via **Wave**, **Orange Money**, **Free Money** ou carte bancaire (intégration **Bictorys**).

Ce repo est un **fork** de [Fari.store](https://fari.store) : seule l'infrastructure nécessaire (auth, paiements Bictorys, webhooks, stockage R2, file d'emails, retraits) a été conservée.

## Stack

- **Frontend** : Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, Inter
- **Backend** : Express 5, Prisma 7, PostgreSQL (Neon serverless), Upstash Redis (queues + rate limiting)
- **Paiements** : Bictorys (charges + payouts)
- **Stockage** : Cloudflare R2 (S3-compatible)
- **Email** : Resend

## Développement local

Deux serveurs à lancer en parallèle :

```bash
# Terminal 1 — Frontend (http://localhost:3000)
npm install
npm run dev

# Terminal 2 — Backend (http://localhost:4000)
cd backend
npm install
npm run db:push   # Appliquer le schema Prisma à la DB Neon
npm run dev
```

Copie `.env.example` → `.env.local` à la racine, et `backend/.env.example` → `backend/.env` avant le premier run.

## Structure

Voir [CLAUDE.md](./CLAUDE.md) pour l'architecture détaillée, les conventions de nommage, les règles critiques (paiements, validation, sécurité) et les pièges connus (workaround TikTok in-app browser).

## Status

🚧 Frontend squelette — branchement d'un design Banani en cours.
