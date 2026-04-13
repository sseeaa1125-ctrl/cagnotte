import { prisma } from "./prisma.js";
import { encrypt, decrypt } from "./crypto.js";
import * as logger from "./logger.js";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type EmailProvider = "brevo" | "systemeio";

export interface EmailContact {
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
}

export interface EmailList {
  id: string;
  name: string;
  memberCount?: number;
}

export interface ConnectParams {
  provider: EmailProvider;
  apiKey: string;
  listId?: string;
  syncEvents?: "all" | "clients" | "leads";
}

// ─────────────────────────────────────────────
// Validate API key by fetching lists
// ─────────────────────────────────────────────

export async function validateAndFetchLists(params: ConnectParams): Promise<{ valid: boolean; lists: EmailList[]; error?: string }> {
  try {
    switch (params.provider) {
      case "brevo":
        return await brevoFetchLists(params.apiKey);
      case "systemeio":
        return await systemeioFetchLists(params.apiKey);
      default:
        return { valid: false, lists: [], error: "Provider non supporté" };
    }
  } catch (err) {
    logger.error(`[EmailMarketing] Erreur validation ${params.provider}`, err);
    return { valid: false, lists: [], error: "Erreur de connexion au service" };
  }
}

// ─────────────────────────────────────────────
// Add contact to connected provider
// ─────────────────────────────────────────────

// Order types that count as "client" (paid) vs "lead" (free/acquisition)
const CLIENT_TYPES = new Set(["sale", "booking", "payment", "donation", "community"]);
const LEAD_TYPES = new Set(["lead_magnet", "waiting_list", "partnership"]);

export function getContactCategory(orderType: string): "client" | "lead" {
  return CLIENT_TYPES.has(orderType.toLowerCase()) ? "client" : "lead";
}

export async function syncContactToProvider(sellerId: string, contact: EmailContact): Promise<boolean> {
  try {
    const integration = await prisma.emailMarketingIntegration.findUnique({
      where: { sellerId },
    });

    if (!integration) return false;

    // Check syncEvents filter
    const category = contact.tags?.[0] ? getContactCategory(contact.tags[0]) : "client";
    const syncEvents = integration.syncEvents || "all";
    if (syncEvents === "clients" && category !== "client") return false;
    if (syncEvents === "leads" && category !== "lead") return false;

    // Add category tag (client or lead) to contact tags
    contact.tags = [...(contact.tags || []), category];

    const apiKey = decrypt(integration.apiKey);
    const provider = integration.provider as EmailProvider;

    switch (provider) {
      case "brevo":
        return await brevoAddContact(apiKey, integration.listId ? parseInt(integration.listId) : null, contact);
      case "systemeio":
        return await systemeioAddContact(apiKey, integration.listId || null, contact);
      default:
        return false;
    }
  } catch (err) {
    logger.error(`[EmailMarketing] Erreur sync contact sellerId=${sellerId}`, err);
    return false;
  }
}

// ─────────────────────────────────────────────
// BREVO (ex-Sendinblue)
// ─────────────────────────────────────────────

async function brevoFetchLists(apiKey: string): Promise<{ valid: boolean; lists: EmailList[]; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch("https://api.brevo.com/v3/contacts/lists?limit=50&offset=0", {
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.status === 401) {
    return { valid: false, lists: [], error: "Clé API Brevo invalide" };
  }

  if (!res.ok) {
    return { valid: false, lists: [], error: `Erreur Brevo (HTTP ${res.status})` };
  }

  const data = await res.json() as { lists: Array<{ id: number; name: string; totalSubscribers: number }> };
  const lists: EmailList[] = (data.lists || []).map((l) => ({
    id: String(l.id),
    name: l.name,
    memberCount: l.totalSubscribers || 0,
  }));

  return { valid: true, lists };
}

async function brevoAddContact(apiKey: string, listId: number | null, contact: EmailContact): Promise<boolean> {
  const body: Record<string, unknown> = {
    email: contact.email,
    updateEnabled: true,
    attributes: {
      ...(contact.firstName && { PRENOM: contact.firstName }),
      ...(contact.lastName && { NOM: contact.lastName }),
    },
  };

  if (listId) {
    body.listIds = [listId];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.ok || res.status === 201 || res.status === 204) {
    logger.log(`[Brevo] Contact ajouté: ${contact.email}`);
    return true;
  }

  const text = await res.text();
  if (text.includes("Contact already exist")) {
    logger.log(`[Brevo] Contact déjà existant: ${contact.email}`);
    return true;
  }

  logger.error(`[Brevo] Erreur ajout contact: ${res.status}`, text.slice(0, 300));
  return false;
}

// ─────────────────────────────────────────────
// SYSTEME.IO
// ─────────────────────────────────────────────

async function systemeioFetchLists(apiKey: string): Promise<{ valid: boolean; lists: EmailList[]; error?: string }> {
  // Systeme.io uses tags as lists
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch("https://api.systeme.io/api/tags?limit=100", {
    headers: {
      "X-API-Key": apiKey,
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.status === 401 || res.status === 403) {
    return { valid: false, lists: [], error: "Clé API Systeme.io invalide. Vérifie ta clé dans Systeme.io > Settings > API Key." };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error(`[Systeme.io] Erreur fetch tags: HTTP ${res.status}`, text.slice(0, 300));
    return { valid: false, lists: [], error: `Erreur Systeme.io (HTTP ${res.status})` };
  }

  const data = await res.json() as { items: Array<{ id: number; name: string }> };
  const lists: EmailList[] = (data.items || []).map((t) => ({
    id: String(t.id),
    name: t.name,
  }));

  logger.log(`[Systeme.io] Clé API validée — ${lists.length} tag(s) trouvé(s)`);
  return { valid: true, lists };
}

async function systemeioAddContact(apiKey: string, tagId: string | null, contact: EmailContact): Promise<boolean> {
  const body: Record<string, unknown> = {
    email: contact.email,
    ...(contact.firstName && { firstName: contact.firstName }),
    ...(contact.lastName && { lastName: contact.lastName }),
  };

  // Combine the stored tag (from list selection) with order-type tags
  const allTags: { name: string }[] = [];
  if (tagId) allTags.push({ name: tagId });
  if (contact.tags?.length) {
    for (const t of contact.tags) allTags.push({ name: t });
  }
  if (allTags.length) body.tags = allTags;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch("https://api.systeme.io/api/contacts", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.ok || res.status === 201) {
    logger.log(`[Systeme.io] Contact ajouté: ${contact.email}`);
    return true;
  }

  const text = await res.text();
  if (text.includes("already exists") || text.includes("contact_already_exist")) {
    logger.log(`[Systeme.io] Contact déjà existant: ${contact.email}`);
    return true;
  }

  logger.error(`[Systeme.io] Erreur ajout contact: ${res.status}`, text.slice(0, 300));
  return false;
}

// ─────────────────────────────────────────────
// SYSTEME.IO — Courses (School)
// ─────────────────────────────────────────────

export interface SystemeioCourse {
  id: number;
  name: string;
}

export async function systemeioFetchCourses(apiKey: string): Promise<{ courses: SystemeioCourse[]; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch("https://api.systeme.io/api/school/courses?limit=100", {
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.status === 401 || res.status === 403) {
    return { courses: [], error: "Clé API Systeme.io invalide" };
  }

  if (!res.ok) {
    return { courses: [], error: `Erreur Systeme.io (HTTP ${res.status})` };
  }

  const data = await res.json() as { items: Array<{ id: number; name: string }> };
  const courses: SystemeioCourse[] = (data.items || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return { courses };
}

export async function systemeioEnrollStudent(apiKey: string, courseId: string, studentEmail: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch(`https://api.systeme.io/api/school/courses/${courseId}/enrollments`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ studentEmail }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.ok || res.status === 201) {
    logger.log(`[Systeme.io] Étudiant inscrit au cours ${courseId}: ${studentEmail}`);
    return true;
  }

  const text = await res.text();
  if (text.includes("already") || text.includes("exist")) {
    logger.log(`[Systeme.io] Étudiant déjà inscrit au cours ${courseId}: ${studentEmail}`);
    return true;
  }

  logger.error(`[Systeme.io] Erreur inscription cours ${courseId}: ${res.status}`, text.slice(0, 300));
  return false;
}

/**
 * Enroll a student in a Systeme.io course after payment confirmation.
 * Looks up the seller's Systeme.io API key from their integration.
 */
export async function enrollStudentInCourse(sellerId: string, courseId: string, studentEmail: string): Promise<boolean> {
  try {
    const integration = await prisma.emailMarketingIntegration.findUnique({
      where: { sellerId },
    });

    if (!integration || integration.provider !== "systemeio") {
      logger.error(`[Systeme.io] Pas d'intégration Systeme.io pour sellerId=${sellerId}`);
      return false;
    }

    const apiKey = decrypt(integration.apiKey);
    return await systemeioEnrollStudent(apiKey, courseId, studentEmail);
  } catch (err) {
    logger.error(`[Systeme.io] Erreur enrollStudentInCourse sellerId=${sellerId}`, err);
    return false;
  }
}

// ─────────────────────────────────────────────
// Connect / Disconnect helpers
// ─────────────────────────────────────────────

export async function connectEmailMarketing(sellerId: string, params: ConnectParams): Promise<{ success: boolean; error?: string }> {
  // Validate first
  const validation = await validateAndFetchLists(params);
  if (!validation.valid) {
    return { success: false, error: validation.error || "Clé API invalide" };
  }

  const encryptedKey = encrypt(params.apiKey);

  const syncEvents = params.syncEvents || "all";

  await prisma.emailMarketingIntegration.upsert({
    where: { sellerId },
    create: {
      sellerId,
      provider: params.provider,
      apiKey: encryptedKey,
      listId: params.listId || null,
      syncEvents,
    },
    update: {
      provider: params.provider,
      apiKey: encryptedKey,
      listId: params.listId || null,
      syncEvents,
      connectedAt: new Date(),
    },
  });

  logger.log(`[EmailMarketing] ${params.provider} connecté — sellerId=${sellerId}`);
  return { success: true };
}

export async function disconnectEmailMarketing(sellerId: string): Promise<void> {
  await prisma.emailMarketingIntegration.deleteMany({ where: { sellerId } });
  logger.log(`[EmailMarketing] Déconnecté — sellerId=${sellerId}`);
}
