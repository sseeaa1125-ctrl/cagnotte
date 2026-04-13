import { ConfirmStep } from "./_ConfirmStep";

// Phase 6 plan 06-02 — /retraits/confirmation (step 3).
// Server wrapper — the client island reads the draft, renders a summary,
// and POSTs to /api/withdrawals on confirm.

export const dynamic = "force-dynamic";

export default function RetraitsConfirmationPage() {
  return <ConfirmStep />;
}
