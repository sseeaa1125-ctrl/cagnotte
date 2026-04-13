import { PinStep } from "./_PinStep";

// Phase 6 plan 06-02 — /retraits/pin (step 2).
// Server component is a thin wrapper — the client island reads the
// sessionStorage draft from useWithdrawalDraft() and replaces back to
// /retraits if the draft is incomplete.

export const dynamic = "force-dynamic";

export default function RetraitsPinPage() {
  return <PinStep />;
}
