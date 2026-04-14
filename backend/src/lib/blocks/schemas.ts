import { z } from "zod";

export const linkBlockConfigSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url(),
  icon: z.enum([
    "instagram", "whatsapp", "tiktok", "youtube",
    "facebook", "telegram", "twitter", "website", "other",
  ]),
  coverUrl: z.string().nullable().optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).optional().default("button"),
});

export const saleBlockConfigSchema = z.object({
  productId: z.string().cuid().optional(),
});

export const bookingBlockConfigSchema = z.object({
  serviceId: z.string().cuid().optional(),
});

const checkoutSectionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["text", "faq", "features", "video"]),
  title: z.string().max(200).optional(),
  content: z.string().max(5000).optional(),
  items: z.array(z.object({
    question: z.string().optional(),
    answer: z.string().optional(),
    text: z.string().optional(),
  })).optional(),
});

export const paymentBlockConfigSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  suggestedAmounts: z.array(z.number().min(500)).max(4).default([5000, 10000, 25000]),
  minAmount: z.number().min(500).default(500),
  maxAmount: z.number().min(500).optional(),
  coverUrl: z.string().nullable().optional(),
  buttonText: z.string().max(30).optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).optional().default("button"),
  videoUrl: z.string().nullable().optional(),
  checkoutSections: z.array(checkoutSectionSchema).nullable().optional(),
  confirmationEmailSubject: z.string().nullable().optional(),
  confirmationEmailBody: z.string().nullable().optional(),
});

export const donationBlockConfigSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  suggestedAmounts: z.array(z.number().min(500)).max(4).default([1000, 2000, 5000]),
  minAmount: z.number().min(500).default(500),
  maxAmount: z.number().min(500).optional(),
  coverUrl: z.string().nullable().optional(),
  buttonText: z.string().max(30).optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).optional().default("button"),
  thankYouMessage: z.string().max(500).optional(),
  videoUrl: z.string().nullable().optional(),
  checkoutSections: z.array(checkoutSectionSchema).nullable().optional(),
  confirmationEmailSubject: z.string().nullable().optional(),
  confirmationEmailBody: z.string().nullable().optional(),
});


/**
 * FUNDRAISER block config — cagnottes.sn Phase 1 plan 01-03.
 *
 * Locked subtype system (festive | solidaire) + cross-field validation via
 * `.superRefine()`. Festive cagnottes require an `occasion` (and reject
 * `cause`/`beneficiary`); solidaire cagnottes require a `cause` and a
 * `beneficiary` (and reject `occasion`).
 *
 * Privacy toggles: `visibility` defaults to "public", `hideAmount` and
 * `hideDonors` default to false (FUND-04 — most creators want transparency;
 * the toggles exist for opt-out).
 *
 * SUBTYPE-LOCK CONTRACT (Phase 2 plan 02-01 will enforce):
 *   Once a Block has any Order with paymentStatus = PAID, `subtype` CANNOT change.
 *   This is enforced in `PATCH /api/blocks/:id` by reading the stored `config.subtype`
 *   from the DB and comparing to the incoming value — a mismatch returns 422.
 *   This schema does NOT enforce the lock because Zod has no access to Prisma state.
 */
export const fundraiserBlockConfigSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  goalAmount: z.number().int().min(1000),
  endDate: z.string().nullable().optional(),
  showDonorCount: z.boolean().default(true),
  suggestedAmounts: z.array(z.number().min(500)).max(4).default([2000, 5000, 10000]),
  minAmount: z.number().min(500).default(500),
  maxAmount: z.number().min(500).optional(),
  coverUrl: z.string().nullable().optional(),
  buttonText: z.string().max(30).optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).optional().default("button"),
  // Phase 7 plan 07-03 — PLSH-08. Optional donor-facing thank-you message
  // rendered on /c/[slug]/merci after a successful donation. Nullable so the
  // wizard and the /modifier edit form can explicitly clear it.
  thankYouMessage: z.string().max(500).nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  checkoutSections: z.array(checkoutSectionSchema).nullable().optional(),
  confirmationEmailSubject: z.string().nullable().optional(),
  confirmationEmailBody: z.string().nullable().optional(),
  checkoutFields: z.array(z.object({
    id: z.string(),
    type: z.enum(["name", "email", "phone", "whatsapp", "custom"]),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean(),
  })).nullable().optional(),

  // ----- Phase 1 plan 01-03 additions -----
  subtype: z.enum(["festive", "solidaire"]),
  occasion: z.enum([
    "anniversaire",
    "pot_de_depart",
    "cadeau_commun",
    "mariage_pacs",
    "naissance",
    "voyage",
    "autre",
  ]).nullable().optional(),
  cause: z.enum([
    "sante_medical",
    "education",
    "projet_solidaire",
    "urgence",
    "animaux",
    "autre",
  ]).nullable().optional(),
  beneficiary: z.enum([
    "moi_meme",
    "un_proche",
    "une_association",
  ]).nullable().optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  hideAmount: z.boolean().default(false),
  hideDonors: z.boolean().default(false),
  // Phase 10 — creator-side close switch. Stored in JSON config so we avoid
  // a Prisma migration. "closed" cagnottes remain readable by everyone with
  // the link; only donations are blocked (orders.ts) and the public page
  // swaps the Participer CTA for a grey "Cagnotte clôturée" badge.
  status: z.enum(["active", "closed"]).default("active").optional(),
}).superRefine((data, ctx) => {
  if (data.subtype === "festive") {
    if (!data.occasion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occasion"],
        message: "L'occasion est requise pour une cagnotte festive.",
      });
    }
    if (data.cause != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cause"],
        message: "Le champ cause doit être vide pour une cagnotte festive.",
      });
    }
    if (data.beneficiary != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["beneficiary"],
        message: "Le bénéficiaire doit être vide pour une cagnotte festive.",
      });
    }
  }
  if (data.subtype === "solidaire") {
    if (!data.cause) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cause"],
        message: "La cause est requise pour une cagnotte solidaire.",
      });
    }
    if (!data.beneficiary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["beneficiary"],
        message: "Le bénéficiaire est requis pour une cagnotte solidaire.",
      });
    }
    if (data.occasion != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occasion"],
        message: "L'occasion doit être vide pour une cagnotte solidaire.",
      });
    }
  }
});

// FORMATION — like SALE but linked to a Systeme.io course
export const formationBlockConfigSchema = z.object({
  productId: z.string().cuid().optional(),
});

// LEAD_MAGNET now has its own schema (was previously reusing SALE)
export const leadMagnetBlockConfigSchema = z.object({
  productId: z.string().cuid().optional(),
});

// WAITING_LIST reuses the same config shape
export const waitingListBlockConfigSchema = z.object({
  productId: z.string().cuid().optional(),
});

// PARTNERSHIP config
export const partnershipBlockConfigSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  coverUrl: z.string().nullable().optional(),
  buttonText: z.string().max(30).optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).optional().default("button"),
  videoUrl: z.string().nullable().optional(),
  checkoutSections: z.array(checkoutSectionSchema).nullable().optional(),
});

// COMMUNITY config
export const communityBlockConfigSchema = z.object({
  communityId: z.string().optional(),
});

const blockTypeToSchema = {
  LINK: linkBlockConfigSchema,
  SALE: saleBlockConfigSchema,
  BOOKING: bookingBlockConfigSchema,
  PAYMENT: paymentBlockConfigSchema,
  DONATION: donationBlockConfigSchema,
  FUNDRAISER: fundraiserBlockConfigSchema,
  FORMATION: formationBlockConfigSchema,
  LEAD_MAGNET: leadMagnetBlockConfigSchema,
  WAITING_LIST: waitingListBlockConfigSchema,
  PARTNERSHIP: partnershipBlockConfigSchema,
  COMMUNITY: communityBlockConfigSchema,
} as const;

type BlockTypeKey = keyof typeof blockTypeToSchema;

const CONTENT_ONLY_TYPES = ["TEXT", "VIDEO", "IMAGE", "DIVIDER", "IFRAME", "VIDEO_EMBED"];

export function validateBlockConfig(type: string, config: unknown) {
  if (CONTENT_ONLY_TYPES.includes(type)) {
    return config ?? {};
  }
  const schema = blockTypeToSchema[type as BlockTypeKey];
  if (!schema) {
    throw new Error(`Type de bloc inconnu : ${type}`);
  }
  return schema.parse(config);
}
