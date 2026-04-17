// Shared date presets for admin dashboard and wallet pages.

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface DatePreset {
  label: string;
  shortLabel: string;
  from: () => string;
  to: () => string;
}

export const ADMIN_DATE_PRESETS: DatePreset[] = [
  {
    label: "Aujourd'hui",
    shortLabel: "Auj.",
    from: () => toISO(new Date()),
    to: () => toISO(new Date()),
  },
  {
    label: "Hier",
    shortLabel: "Hier",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return toISO(d);
    },
    to: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return toISO(d);
    },
  },
  {
    label: "7 derniers jours",
    shortLabel: "7j",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return toISO(d);
    },
    to: () => toISO(new Date()),
  },
  {
    label: "Ce mois",
    shortLabel: "Mois",
    from: () => {
      const d = new Date();
      return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
    },
    to: () => toISO(new Date()),
  },
  {
    label: "Mois dernier",
    shortLabel: "M-1",
    from: () => {
      const d = new Date();
      return toISO(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    },
    to: () => {
      const d = new Date();
      return toISO(new Date(d.getFullYear(), d.getMonth(), 0));
    },
  },
];
