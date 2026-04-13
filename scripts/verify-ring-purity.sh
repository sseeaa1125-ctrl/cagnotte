#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────
# Ring 1 purity: src/components/ui/* must not import api / useApi / constants / AuthContext.
# Exception: Toast.tsx may import @/contexts/ToastContext (it's a thin re-export wrapper).
# ─────────────────────────────────────────────────────────────────────────

r1_violations=$(grep -rE "from ['\"](@/lib/(api|useApi|constants)|@/contexts/AuthContext)" src/components/ui/ || true)

if [ -n "$r1_violations" ]; then
  echo "❌ Ring-1 purity violation in src/components/ui/:"
  echo "$r1_violations"
  exit 1
fi
echo "✅ Ring 1 pure (src/components/ui/)"

# ─────────────────────────────────────────────────────────────────────────
# Ring 2 purity: src/components/{layout,cagnottes,checkout,share,notifications,trust}/*
# may import Ring 1 + @/lib/utils + @/lib/format + @/lib/constants, but NOT api / useApi / AuthContext.
# ─────────────────────────────────────────────────────────────────────────

r2_dirs=(
  src/components/layout
  src/components/cagnottes
  src/components/checkout
  src/components/share
  src/components/notifications
  src/components/trust
)

r2_violations=""
for dir in "${r2_dirs[@]}"; do
  if [ -d "$dir" ]; then
    found=$(grep -rE "from ['\"](@/lib/(api|useApi)|@/contexts/AuthContext)" "$dir" || true)
    if [ -n "$found" ]; then
      r2_violations="${r2_violations}${found}\n"
    fi
  fi
done

if [ -n "$r2_violations" ]; then
  echo -e "❌ Ring-2 purity violation (data-fetching in composed block):"
  echo -e "$r2_violations"
  exit 1
fi
echo "✅ Ring 2 pure (composed blocks own no data)"
