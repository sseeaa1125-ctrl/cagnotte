# Fari.store — Tech Stack

## Runtime & Framework

| Package | Version | Rôle |
|---|---|---|
| Node.js | 20.x LTS | Runtime serveur |
| Next.js | 14.2.x | Framework fullstack (App Router) |
| React | 18.3.x | UI library |
| React DOM | 18.3.x | React rendering |
| TypeScript | 5.5.x | Typage statique |

---

## Styling

| Package | Version | Rôle |
|---|---|---|
| Tailwind CSS | 3.4.x | Utility-first CSS |
| @tailwindcss/typography | 0.5.x | Prose styling (descriptions, bio) |
| tailwind-merge | 2.3.x | Merge de classes conditionnelles |
| clsx | 2.1.x | Construction de classNames conditionnels |

---

## Base de données & ORM

| Package | Version | Rôle |
|---|---|---|
| Prisma | 5.17.x | ORM + migrations |
| @prisma/client | 5.17.x | Client Prisma auto-généré |
| PostgreSQL | 16.x | Base de données (hébergée sur Neon) |

**Configuration Prisma** :
- Provider : `postgresql`
- Relation mode : `prisma`
- Preview features : aucune requise

**Pourquoi PostgreSQL** : les relations sont complexes (vendeur → blocs → commandes → paiements → clients). Le JSON flexible de PostgreSQL sert aussi pour le champ `config` des blocs (chaque type de bloc a un schema JSON différent).

---

## Validation

| Package | Version | Rôle |
|---|---|---|
| zod | 3.23.x | Validation des inputs API + validation config blocs |

**Usage critique** : chaque type de bloc a un schema Zod spécifique pour valider sa configuration. Cela garantit la cohérence même quand on ajoute de nouveaux types de blocs.

```typescript
// Exemple : schema de validation par type de bloc
const linkBlockSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url(),
  icon: z.enum(["instagram", "whatsapp", "tiktok", "youtube", "facebook", "telegram", "twitter", "website", "other"]),
});

const saleBlockSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price: z.number().min(500),
  currency: z.literal("XOF"),
  fileUrl: z.string().url(),
  coverUrl: z.string().url().optional(),
});
```

---

## Authentification & Sécurité

| Package | Version | Rôle |
|---|---|---|
| bcryptjs | 2.4.x | Hash des mots de passe |
| @types/bcryptjs | 2.4.x | Types TypeScript |
| jose | 5.6.x | JWT signing/verification (edge-compatible) |

**Pas de NextAuth.js** — l'auth est custom. Le flow est simple :
1. Inscription → email + password → bcrypt hash → JWT
2. Connexion → vérification bcrypt → JWT
3. Middleware Next.js vérifie le JWT sur les routes `/dashboard/*`

**JWT structure** :
```typescript
{
  sub: "seller_id",       // ID du vendeur
  slug: "amadou",         // Slug de la page
  plan: "free" | "pro",   // Plan actif
  iat: number,
  exp: number             // 7 jours
}
```

---

## APIs externes

### Bictorys Direct API

| Détail | Valeur |
|---|---|
| Version API | v1 |
| Base URL | `https://api.bictorys.com/pay/v1` |
| Mode | Direct API (PAS checkout hébergé) |
| Auth | Header `X-Api-Key` (clé publique) |
| Webhook validation | Header `X-Secret-Key` |
| Docs | https://docs.bictorys.com |
| Opérateurs V1 | Wave, Orange Money, Free Money |
| Devise | XOF |

**Architecture provider-agnostic** : le code paiement est isolé derrière une interface TypeScript :

```typescript
// lib/payments/types.ts
interface PaymentProvider {
  createTransaction(params: CreateTransactionParams): Promise<Transaction>;
  verifyWebhook(headers: Headers, body: string): boolean;
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>;
}

// lib/payments/bictorys.ts
class BictorysProvider implements PaymentProvider { ... }

// Futur : lib/payments/cinetpay.ts
class CinetPayProvider implements PaymentProvider { ... }
```

Ajouter un nouveau provider = créer un fichier, implémenter l'interface, l'enregistrer dans le registry. Zéro modification du code existant.

---

## Upload de fichiers

| Package | Version | Rôle |
|---|---|---|
| @vercel/blob | 0.23.x | Stockage de fichiers (couvertures, fichiers digitaux) |

**Pourquoi Vercel Blob** : intégration native avec Next.js, pas de config S3 à gérer, CDN inclus, gratuit jusqu'à 500 MB.

**Limites V1** :
- Image de couverture : max 5 MB (JPG, PNG, WebP)
- Fichier digital : max 100 MB (PDF, ZIP, MP3, MP4)
- Photo de profil : max 2 MB (JPG, PNG, WebP) → redimensionnée côté serveur à 256x256

---

## Email

| Package | Version | Rôle |
|---|---|---|
| resend | 3.4.x | Envoi d'emails transactionnels |
| @react-email/components | 0.0.22 | Templates email en React |

Domaine d'envoi : `noreply@fari.store`

**Emails transactionnels V1** :
1. `verification-code` — Code 6 chiffres à l'inscription
2. `sale-confirmation-buyer` — Confirmation d'achat + lien de téléchargement
3. `sale-notification-seller` — Notification de vente au vendeur
4. `booking-confirmation-buyer` — Confirmation de réservation
5. `booking-notification-seller` — Notification de réservation au vendeur
6. `payment-receipt` — Reçu de paiement libre
7. `payment-notification-seller` — Notification de paiement au vendeur
8. `booking-cancelled` — Annulation de réservation (au client)

---

## UI & Fonts

| Ressource | Source | Rôle |
|---|---|---|
| Inter | Google Fonts (next/font) | Typographie principale (corps + titres) |
| Lucide React | 0.408.x | Icônes |

**Une seule font** (Inter) pour minimiser le poids de chargement sur 3G. Inter est lisible à toutes les tailles, supporte le français avec accents, et est déjà optimisée par next/font.

```typescript
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
```

---

## Drag & Drop

| Package | Version | Rôle |
|---|---|---|
| @dnd-kit/core | 6.1.x | Réordonnancement des blocs dans le dashboard |
| @dnd-kit/sortable | 8.0.x | Extension sortable pour les listes |
| @dnd-kit/utilities | 3.2.x | Utilitaires (transforms CSS) |

**Pourquoi @dnd-kit** : léger (~12KB gzipped), accessible, fonctionne bien sur mobile tactile, meilleur que react-beautiful-dnd (abandonné par Atlassian).

---

## Calendrier (Bloc Booking)

| Package | Version | Rôle |
|---|---|---|
| date-fns | 3.6.x | Manipulation de dates (créneaux, disponibilités) |
| date-fns/locale/fr | inclus | Locale française |

**Pas de librairie de calendrier UI** — le sélecteur de créneaux est custom (grille simple de boutons par jour) pour garder le bundle léger. Sur 3G, un composant lourd comme react-big-calendar serait rédhibitoire.

---

## Utilitaires

| Package | Version | Rôle |
|---|---|---|
| nanoid | 5.0.x | Génération d'IDs courts pour les slugs et refs commande |
| sharp | 0.33.x | Redimensionnement d'images (profil, couvertures) côté serveur |

---

## Dev & Build

| Package | Version | Rôle |
|---|---|---|
| eslint | 8.57.x | Linting |
| eslint-config-next | 14.2.x | Config ESLint Next.js |
| prettier | 3.3.x | Formatage du code |
| prettier-plugin-tailwindcss | 0.6.x | Tri automatique des classes Tailwind |

---

## Hébergement & Infra

| Service | Rôle |
|---|---|
| Vercel | Hébergement Next.js (frontend + API routes + Cron) |
| Neon | PostgreSQL serverless (free tier pour le MVP) |
| Vercel Blob | Stockage fichiers (couvertures, fichiers digitaux, photos profil) |
| Vercel Cron Jobs | Nettoyage fichiers expirés (24h), vérification transactions pending (5min) |
| Resend | Emails transactionnels |
| Domaine | fari.store (registrar : Namecheap ou Porkbun) |

**Configuration DNS pour sous-domaines vendeurs** :
- `*.fari.store` → wildcard CNAME vers Vercel
- Next.js middleware lit le sous-domaine et route vers la bonne page vendeur

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const slug = hostname.split(".fari.store")[0];

  // Si c'est un sous-domaine vendeur (pas "www" ni "app")
  if (slug && slug !== "www" && slug !== "app") {
    return NextResponse.rewrite(new URL(`/store/${slug}${request.nextUrl.pathname}`, request.url));
  }
}
```

---

## package.json (dependencies)

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "18.3.x",
    "react-dom": "18.3.x",
    "@prisma/client": "5.17.x",
    "@vercel/blob": "0.23.x",
    "zod": "3.23.x",
    "bcryptjs": "2.4.x",
    "jose": "5.6.x",
    "resend": "3.4.x",
    "@react-email/components": "0.0.22",
    "lucide-react": "0.408.x",
    "tailwind-merge": "2.3.x",
    "clsx": "2.1.x",
    "@dnd-kit/core": "6.1.x",
    "@dnd-kit/sortable": "8.0.x",
    "@dnd-kit/utilities": "3.2.x",
    "date-fns": "3.6.x",
    "nanoid": "5.0.x",
    "sharp": "0.33.x"
  },
  "devDependencies": {
    "typescript": "5.5.x",
    "prisma": "5.17.x",
    "@types/node": "20.x",
    "@types/react": "18.3.x",
    "@types/react-dom": "18.3.x",
    "@types/bcryptjs": "2.4.x",
    "tailwindcss": "3.4.x",
    "@tailwindcss/typography": "0.5.x",
    "postcss": "8.4.x",
    "autoprefixer": "10.4.x",
    "eslint": "8.57.x",
    "eslint-config-next": "14.2.x",
    "prettier": "3.3.x",
    "prettier-plugin-tailwindcss": "0.6.x"
  }
}
```

---

## Ce qu'on N'UTILISE PAS (et pourquoi)

| Lib/Tool | Pourquoi non |
|---|---|
| NextAuth.js | Overkill. Auth custom (bcrypt + JWT) est plus simple et plus léger |
| shadcn/ui | On veut un design propre et minimaliste, pas le look shadcn qu'on voit partout |
| Redux / Zustand | Le state est simple. React Context + useState suffisent |
| Stripe | Ne supporte pas le mobile money en Afrique de l'Ouest. On utilise Bictorys |
| Firebase | Pas besoin. PostgreSQL + Prisma suffisent |
| MongoDB / Mongoose | On a des relations complexes (vendeur → blocs → commandes). SQL est le bon choix |
| Axios | fetch() natif suffit dans Next.js |
| Framer Motion | Trop lourd (30KB+) pour des pages qui doivent charger en 2s sur 3G |
| react-big-calendar | Trop lourd. Un calendrier custom en grille de boutons est plus léger et suffisant |
| i18next | Pas de multi-langue au MVP. Toutes les strings sont en dur en français, mais dans des constantes centralisées pour faciliter la migration future |
| Cloudinary | Vercel Blob est plus simple, intégré, et gratuit pour le MVP |
| AWS S3 | Même raison — Vercel Blob évite la configuration AWS |
| Tailwind UI / Headless UI | On construit nos propres composants. Plus léger, plus personnalisé |
