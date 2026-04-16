# login — Banani source extract

**Banani screen title (verbatim):** `Connexion - Cagnotte.sn`
**Matched MCP index:** designs[1] (screen `main_next1.jsx` + component `LoginForm.jsx`)
**Target route:** `/connexion`

## Layout description
Centered card on `gray-50` background, same shell as signup. White `rounded-[2rem]` card, max-width 28rem. Header has no icon badge (unlike signup) — just an H1 `Bon retour !` and a subtitle. Form is `space-y-6` with email, password (with "Oublié ?" link inline with label), primary submit, divider, and TWO alt auth buttons (email CTA + Apple). Footer link to signup.

## Key sections
- **Pre-section:** `TopBanner` + public `Navbar`
- **Header:** `Bon retour !` + subtitle, no icon
- **Form card:** Email + Password (with inline "Oublié ?" link aligned right of password label)
- **Submit:** full-width navy `Se connecter`, `py-4`, `shadow-lg`
- **Divider:** `ou`
- **Alt auth:** `Continuer avec Email` (white/border/mail icon) + `Continuer avec Apple` (black/white icon)
- **Footer link:** `Pas encore de compte ? S'inscrire`

## Form fields
| Field | Type | Label (FR) | Placeholder | Validation hint |
|---|---|---|---|---|
| email | email | Adresse e-mail | exemple@email.com | required, valid email |
| password | password (eye toggle) | Mot de passe | •••••••• | required |

## Banani tokens used
- Colors: `#172866` navy, gray-300 borders, `text-blue-600` for "Oublié ?" link (deviation — elsewhere navy), black for Apple CTA
- Font: Poppins h1 (`text-3xl font-black`), Inter body
- Radii: card `rounded-[2rem]`, inputs/buttons `rounded-xl`
- Notable classes: `space-y-6`, `shadow-lg` on primary CTA, `relative flex items-center py-4` for divider

## Composition plan (Phase 3 primitives/blocks)
- `PublicNavbar` (Phase 3)
- `Card` wrapper (`rounded-2xl`, shadow-sm, border)
- `Input leftIcon={<Mail/>}` for email
- `PasswordInput leftIcon={<Lock/>}` with eye toggle
- Inline `<Link>` to `/mot-de-passe-oublie` aligned right of password `<Label>`
- `Button variant="primary"` for `Se connecter`
- Divider component (horizontal rule with centered text)
- `{FEATURE_SOCIAL_AUTH && <SocialButton provider="email|apple" />}` — gated
- Footer `<Link>` to `/inscription`

## Banani → cagnottes.sn translations needed
- `"Continuer avec Email"` — odd: this is a login screen and "Email" is already the primary method. Likely placeholder for "Magic Link" or SSO email. Gate behind `FEATURE_SOCIAL_AUTH` (or drop).
- `"Continuer avec Apple"` — keep JSX, gate behind `FEATURE_SOCIAL_AUTH = false`
- `"Oublié ?"` uses `text-blue-600` — override to navy `#172866` for brand consistency, OR accept as subtle visual affordance (document deviation)
- No Google SSO in login screen (deviation from signup). Flag to executor.

## Key copy (French, verbatim from Banani)
> **H1:** `Bon retour !`
> **Subtitle:** `Connectez-vous pour gérer vos cagnottes et suivre vos participations.`
> **Labels:** `Adresse e-mail`, `Mot de passe`
> **Forgot link:** `Oublié ?`
> **Primary CTA:** `Se connecter`
> **Divider:** `ou`
> **Alt CTAs:** `Continuer avec Email`, `Continuer avec Apple`
> **Footer link:** `Pas encore de compte ? S'inscrire`

## Notable details / risks
- Password input shows `eye-off` icon inside right slot (toggle)
- "Oublié ?" aligned right of password label (not below the input) — compact layout
- Apple button uses pure `bg-black text-white` (no hover state shown)
- No "remember me" checkbox in Banani — consider adding via Phase 5 plan or skip
- No error state shown in Banani — `login-variant` is NOT exported as a separate screen. See `login-variant.md`.
- No CAPTCHA / rate-limit UI — mention to executor; current backend has `writeLimiter` which returns 429, frontend must handle
