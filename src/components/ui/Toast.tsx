// Toast primitive — thin re-export wrapper around the existing ToastContext.
// The ToastContext (src/contexts/ToastContext.tsx) owns all state + rendering.
// Consumers of the design system import from @/components/ui (this file) for discoverability.
// PRIM-07 is satisfied by re-export: no duplication of state, no double-portal.

export { useToast, ToastProvider } from "@/contexts/ToastContext";
