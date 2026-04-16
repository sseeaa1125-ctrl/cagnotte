// Single source of truth for fundraiser progress math. `percent` is the
// raw value (may exceed 100 when a cagnotte overshoots its goal) and
// drives all text labels. `barWidth` is clamped at 100 because a CSS
// width can't represent 110% visually — the label tells the user the
// bar is "full and over".
export function computeProgress(
  raised: number,
  goal: number,
): { percent: number; barWidth: number } {
  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
    return { percent: 0, barWidth: 0 };
  }
  const percent = Math.round((raised / goal) * 100);
  return { percent, barWidth: Math.min(100, Math.max(0, percent)) };
}
