export const CAGNOTTE_SORT_MODES = [
  "recent",
  "oldest",
  "raised_desc",
  "raised_asc",
] as const;

export type CagnotteSortMode = (typeof CAGNOTTE_SORT_MODES)[number];

export function parseCagnotteSort(value: unknown): CagnotteSortMode {
  if (typeof value === "string" && (CAGNOTTE_SORT_MODES as readonly string[]).includes(value)) {
    return value as CagnotteSortMode;
  }
  return "recent";
}
