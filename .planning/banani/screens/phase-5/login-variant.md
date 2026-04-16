# login-variant — Banani source extract

**Banani screen title (verbatim):** NOT PRESENT IN BANANI EXPORT
**Matched MCP index:** — (no design in `designs[]` for a login error/filled state)
**Target route:** same as `login` — `/connexion`

## Status
**NOT PRESENT IN BANANI EXPORT.** The Banani flow contains only one login screen (designs[1] → `LoginForm.jsx`). There is no separate error state, filled state, or loading variant in the export.

## Recommended default (for executor)
Render `login-variant` as the **same `/connexion` route** with in-component state for:

1. **Error state** — when backend returns 401/429:
   - Display an `<Alert variant="error">` block above the email field (Phase 3 `Alert` block).
   - Copy suggestions (French, match Banani tone):
     - 401: `"E-mail ou mot de passe incorrect."`
     - 429: `"Trop de tentatives. Réessayez dans quelques minutes."`
     - Network: `"Connexion indisponible. Vérifiez votre connexion."`
   - Mark email + password inputs with `aria-invalid="true"` and red border (`border-red-500`).

2. **Filled state** — just a non-empty controlled input; no separate design.

3. **Loading state** — disable submit button, swap label for `"Connexion…"` and show spinner. Use `Button isLoading` prop from Phase 3.

4. **Focus state** — input uses `focus:border-[#172866]` (visible in other Banani form components like the create-wizard inputs).

## Composition plan
- Reuse `/connexion` page
- Add `const [error, setError] = useState<string | null>(null)` in `LoginForm` client component
- Show `<Alert>` when `error !== null`
- No new route, no new file

## Notable details / risks
- Phase 5 plan should explicitly list these states in the acceptance criteria even though Banani didn't render them
- Do NOT create a separate `/connexion-erreur` route
- The existing `api()` wrapper in `src/lib/api.ts` auto-retries on 401 refresh, so pure 401 from login is the final state (no retry loop)
