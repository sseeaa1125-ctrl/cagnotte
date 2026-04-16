# signup — Banani source extract

**Banani screen title (verbatim):** `Inscription - Cagnotte.sn`
**Matched MCP index:** designs[2] (screen `main_next1_next1.jsx`) — duplicate at designs[19] (same `SignupForm` + PreFooter/Footer)
**Target route:** `/inscription`

## Layout description
Centered card layout on a `gray-50` full-height section. Max-width ~28rem (`max-w-md`), white `rounded-[2rem]` card with shadow and light border. Header shows a pink circular icon badge (gift icon on `#FBE6ED`), a bold title, and a subtitle. Form column uses `space-y-5` and ends with divider + social auth grid + footer link to login.

## Key sections
- **Pre-section:** `TopBanner` + public `Navbar` (from shared components)
- **Icon badge:** 64px pink circle (`bg-[#FBE6ED]`) with `gift` icon (32px), navy foreground
- **Form card:** Prénom + Nom (2-col grid), Email, Password (with visibility toggle), password hint
- **Submit:** full-width navy button `Créer mon compte` + right arrow icon, `py-4`
- **Divider:** horizontal rule with text `ou s'inscrire avec`
- **Social grid:** 2-col — Google (white/border) + Apple (black)
- **Footer link:** `Vous avez déjà un compte ? Se connecter`

## Form fields
| Field | Type | Label (FR) | Placeholder | Validation hint |
|---|---|---|---|---|
| firstName | text | Prénom | Jean | required |
| lastName | text | Nom | Dupont | required |
| email | email | Adresse e-mail | exemple@email.com | required, valid email |
| password | password (eye toggle) | Mot de passe | •••••••• | `8 caractères minimum, dont un chiffre et une majuscule.` |

## Banani tokens used
- Colors: `#172866` (navy / primary), `#FBE6ED` (pink accent), `#0f1a45` (navy hover), `gray-50/100/200/300/400/500/600` for neutrals, `text-red-500` required marker
- Font: headings = Poppins (`font-black` h1), body = Inter
- Radii: card `rounded-[2rem]` (~2rem = radius-2xl token `2.5rem` approx), inputs `rounded-xl` (0.75rem), button `rounded-xl`
- Icon badge: 64×64 rounded-full
- Notable classes: `space-y-5`, `shadow-lg` on primary CTA, `grid grid-cols-2 gap-4`

## Composition plan (Phase 3 primitives/blocks)
- `PublicNavbar` (layout block, existing Phase 3)
- `Card` wrapper (`rounded-2xl`, white bg, shadow, border)
- `Input` primitive for firstName/lastName/email/password (email + password use `leftIcon` slot)
- `PasswordInput` variant (eye toggle — Phase 3 `Input` supports `rightSlot`)
- `Button variant="primary"` for submit
- `{FEATURE_SOCIAL_AUTH && <SocialButton provider="google|apple" />}` — JSX present but gated (hidden in v1)
- Footer link via Next `Link` to `/connexion`

## Banani → cagnottes.sn translations needed
- No monetary amounts shown (N/A for `€ → FCFA`)
- `"Continuer avec Google"` / Google button — keep JSX behind `FEATURE_SOCIAL_AUTH = false`
- `"Continuer avec Apple"` / Apple button — same gate
- No phone field in Banani screen (future: if we add `+221` phone, not in this extract)
- No CAPTCHA shown — Phase 5 plan may require one; mention to executor but not present in Banani
- Icon library: Banani uses `lucide`-style `Icon i="gift|mail|lock|eye-off|arrow-right|chrome|apple"` — map to our icon set (already lucide-react per Phase 3)

## Key copy (French, verbatim from Banani)
> **H1:** `Créer ma cagnotte`
> **Subtitle:** `Créez votre compte en quelques secondes pour lancer votre collecte.`
> **Labels:** `Prénom`, `Nom`, `Adresse e-mail`, `Mot de passe`
> **Password hint:** `8 caractères minimum, dont un chiffre et une majuscule.`
> **CTA:** `Créer mon compte` (with arrow-right icon)
> **Divider text:** `ou s'inscrire avec`
> **Social labels:** `Google`, `Apple`
> **Footer link:** `Vous avez déjà un compte ? Se connecter`

## Notable details / risks
- Password field includes an eye/eye-off toggle (decorative in Banani — we must wire real toggle)
- Required fields marked with red asterisk — Banani shows none here but our `Input` supports it; email + password + both name fields should be required
- Banani uses `€` in other screens; auth screens have no currency so no translation needed
- No "terms of service" checkbox in Banani signup — Phase 5 plan may require it (regulatory). Flag as DELTA.
- Banani shows firstName/lastName but backend `Seller` model uses a single name — executor must either split into 2 columns in DB or concat client-side. Check schema.
- Duplicate screen at designs[19] adds `PreFooter` + `Footer` — the canonical auth layout should probably match designs[19] (with footer) per consistency with Navbar-wrapped flow.
