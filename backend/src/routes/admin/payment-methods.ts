import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as logger from "../../lib/logger.js";

export const adminPaymentMethodsRouter = Router();

const CONFIG_KEY = "payment_methods";

// Types valides
const VALID_OPERATORS = ["wave_money", "orange_money", "maxit", "mtn_money", "moov", "togocell", "mobicash", "card"] as const;
const VALID_COUNTRIES = ["SN", "CI", "BF", "ML", "TG", "BJ", "OTHER"] as const;

// Schéma de validation pour la config
const paymentMethodConfigSchema = z.object({
  // Pays actifs dans le dropdown (codes)
  activeCountries: z.array(z.enum(VALID_COUNTRIES)),
  // Opérateurs actifs par pays
  countryOperators: z.record(
    z.enum(VALID_COUNTRIES),
    z.array(z.enum(VALID_OPERATORS))
  ),
});

type PaymentMethodConfig = z.infer<typeof paymentMethodConfigSchema>;

// Config par défaut (basée sur les tests Bictorys mars 2026)
const DEFAULT_CONFIG: PaymentMethodConfig = {
  activeCountries: ["SN", "CI", "OTHER"],
  countryOperators: {
    SN: ["wave_money", "orange_money", "maxit", "card"],
    CI: ["wave_money", "orange_money", "mtn_money", "card"],
    OTHER: ["card"],
  },
};

// Catalogue complet (toutes les combos possibles chez Bictorys)
const FULL_CATALOG = {
  countries: [
    { code: "SN", name: "Sénégal", flag: "🇸🇳" },
    { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
    { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
    { code: "ML", name: "Mali", flag: "🇲🇱" },
    { code: "TG", name: "Togo", flag: "🇹🇬" },
    { code: "BJ", name: "Bénin", flag: "🇧🇯" },
    { code: "OTHER", name: "Autre", flag: "🌍" },
  ],
  operators: [
    { id: "wave_money", name: "Wave" },
    { id: "orange_money", name: "Orange Money" },
    { id: "maxit", name: "Maxit" },
    { id: "mtn_money", name: "MTN Money" },
    { id: "moov", name: "Moov Money" },
    { id: "togocell", name: "Togocell" },
    { id: "mobicash", name: "Mobicash" },
    { id: "card", name: "Carte bancaire" },
  ],
  // Toutes les combos possibles par pays
  possibleOperators: {
    SN: ["wave_money", "orange_money", "maxit", "card"],
    CI: ["wave_money", "orange_money", "mtn_money", "moov", "card"],
    BF: ["wave_money", "moov", "mobicash", "card"],
    ML: ["orange_money", "mobicash", "card"],
    TG: ["moov", "togocell", "card"],
    BJ: ["mtn_money", "moov", "card"],
    OTHER: ["card"],
  },
};

// ── GET /api/admin/payment-methods — Lire la config actuelle + catalogue ──
adminPaymentMethodsRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const row = await prisma.platformConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    const config: PaymentMethodConfig = row
      ? paymentMethodConfigSchema.parse(row.value)
      : DEFAULT_CONFIG;

    res.json({
      config,
      catalog: FULL_CATALOG,
    });
  } catch (err) {
    logger.error("Erreur lecture payment methods config", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PUT /api/admin/payment-methods — Mettre à jour la config ──
adminPaymentMethodsRouter.put("/", requireAdmin, async (req, res) => {
  try {
    const data = paymentMethodConfigSchema.parse(req.body);

    // Validation : chaque pays actif doit avoir au moins "card"
    for (const country of data.activeCountries) {
      const ops = data.countryOperators[country];
      if (!ops || !ops.includes("card")) {
        res.status(400).json({
          error: `Le pays ${country} doit avoir au moins "Carte bancaire" comme mode de paiement`,
        });
        return;
      }
    }

    // Validation : OTHER doit toujours être actif avec card
    if (!data.activeCountries.includes("OTHER")) {
      data.activeCountries.push("OTHER");
    }
    if (!data.countryOperators.OTHER) {
      data.countryOperators.OTHER = ["card"];
    }

    const jsonValue = JSON.parse(JSON.stringify(data));
    await prisma.platformConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: jsonValue },
      create: { key: CONFIG_KEY, value: jsonValue },
    });

    // Log admin
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.sub,
          action: "PAYMENT_METHODS_UPDATED",
          target: "platform:payment_methods",
          details: JSON.parse(JSON.stringify(data)),
          ip: req.ip || null,
        },
      });
    }

    logger.log(`[Admin] Payment methods config updated by ${req.admin?.email}`);
    res.json({ success: true, config: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Données invalides", details: err.errors });
      return;
    }
    logger.error("Erreur mise à jour payment methods config", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
