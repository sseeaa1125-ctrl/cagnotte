import { z } from "zod";

// Traduction des erreurs Zod en messages français compréhensibles pour l'utilisateur

const FIELD_LABELS: Record<string, string> = {
  title: "Le titre",
  description: "La description",
  price: "Le prix",
  minAmount: "Le montant minimum",
  maxAmount: "Le montant maximum",
  amount: "Le montant",
  suggestedAmounts: "Les montants suggérés",
  email: "L'adresse email",
  password: "Le mot de passe",
  name: "Le nom",
  fullName: "Le nom complet",
  phone: "Le numéro de téléphone",
  url: "L'URL",
  coverUrl: "L'image de couverture",
  buttonText: "Le texte du bouton",
  duration: "La durée",
  location: "Le lieu",
  thankYouMessage: "Le message de remerciement",
  confirmationEmailSubject: "L'objet de l'email",
  confirmationEmailBody: "Le contenu de l'email",
  customerName: "Le nom du client",
  customerEmail: "L'email du client",
  customerPhone: "Le téléphone du client",
  payoutPhone: "Le numéro de retrait",
  payoutOperator: "L'opérateur de retrait",
  reference: "La référence",
  reason: "La raison",
  code: "Le code",
  slug: "Le lien personnalisé",
  displayName: "Le nom d'affichage",
  bio: "La bio",
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || `Le champ "${field}"`;
}

function translateMessage(field: string, message: string): string {
  const label = getFieldLabel(field);

  // "Required"
  if (message === "Required") {
    return `${label} est obligatoire`;
  }

  // "String must contain at least X character(s)"
  const minChars = message.match(/at least (\d+) character/);
  if (minChars) {
    return minChars[1] === "1"
      ? `${label} est obligatoire`
      : `${label} doit contenir au moins ${minChars[1]} caractères`;
  }

  // "String must contain at most X character(s)"
  const maxChars = message.match(/at most (\d+) character/);
  if (maxChars) {
    return `${label} ne doit pas dépasser ${maxChars[1]} caractères`;
  }

  // "Number must be greater than or equal to X"
  const minNum = message.match(/greater than or equal to (\d+)/);
  if (minNum) {
    return `${label} doit être d'au moins ${Number(minNum[1]).toLocaleString("fr-FR")} FCFA`;
  }

  // "Number must be less than or equal to X"
  const maxNum = message.match(/less than or equal to (\d+)/);
  if (maxNum) {
    return `${label} ne doit pas dépasser ${Number(maxNum[1]).toLocaleString("fr-FR")} FCFA`;
  }

  // "Invalid email"
  if (message.toLowerCase().includes("invalid email") || message.toLowerCase().includes("invalid_string")) {
    if (field.includes("email") || field.includes("Email")) {
      return "L'adresse email n'est pas valide";
    }
    if (field.includes("url") || field.includes("Url")) {
      return "L'URL n'est pas valide";
    }
    return `${label} n'est pas valide`;
  }

  // "Invalid url"
  if (message.toLowerCase().includes("invalid url")) {
    return "L'URL n'est pas valide";
  }

  // "Expected number, received nan" / "Expected number, received string"
  if (message.includes("Expected number") || message.includes("Expected integer")) {
    return `${label} doit être un nombre`;
  }

  // "Expected string, received number"
  if (message.includes("Expected string")) {
    return `${label} n'est pas au bon format`;
  }

  // "Array must contain at most X element(s)"
  const maxArr = message.match(/at most (\d+) element/);
  if (maxArr) {
    return `${label} ne peut contenir que ${maxArr[1]} éléments maximum`;
  }

  // "Array must contain at least X element(s)"
  const minArr = message.match(/at least (\d+) element/);
  if (minArr) {
    return `${label} doit contenir au moins ${minArr[1]} élément(s)`;
  }

  // "Invalid enum value"
  if (message.includes("Invalid enum value")) {
    return `${label} : valeur non autorisée`;
  }

  // Fallback: return a clean French message with the field name
  return `${label} : donnée invalide`;
}

/**
 * Formate une ZodError en message français lisible pour l'utilisateur.
 * Retourne le premier message d'erreur traduit.
 */
export function formatZodError(err: z.ZodError): string {
  const firstError = err.errors[0];
  if (!firstError) return "Données invalides";

  const field = firstError.path.length > 0
    ? firstError.path[firstError.path.length - 1]?.toString() || ""
    : "";

  return translateMessage(field, firstError.message);
}
