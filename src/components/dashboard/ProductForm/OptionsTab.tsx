"use client";

import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import { Input, Avatar } from "@/components/ui";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { Star, Trash2, Plus, Eye, FileText } from "lucide-react";
import type { ProductTypeDefinition } from "@/lib/productTypes";
import type { Review, OrderBump, LeadField } from "@/types";
import type { TabProps } from "./types";
import { CollapsibleSection } from "./FormHelpers";
import { LeadFieldEditor } from "@/components/dashboard/LeadFieldEditor";

const CHECKOUT_DEFAULT_FIELDS: LeadField[] = [
  { id: "f-name", type: "name", label: "Nom", placeholder: "Ton nom", required: true },
  { id: "f-phone", type: "phone", label: "Téléphone", placeholder: "+221 77 000 00 00", required: true },
];

// ══════════════════════════════════════════════
// OptionsTab
// ══════════════════════════════════════════════

export function OptionsTab({ productType, form, set }: TabProps) {
  return (
    <div className="space-y-4">
      {/* Checkout Fields (DONATION / PAYMENT) */}
      {(productType.type === "DONATION" || productType.type === "FUNDRAISER" || productType.type === "PAYMENT") && (
        <CollapsibleSection title="Champs du formulaire" icon="📝">
          <p className="mb-2 text-xs text-gray-400">
            Configure les champs que les visiteurs doivent remplir avant de payer.
          </p>
          <LeadFieldEditor
            fields={form.checkoutFields}
            onChange={(fields) => set("checkoutFields", fields)}
            defaultFields={CHECKOUT_DEFAULT_FIELDS}
          />
        </CollapsibleSection>
      )}

      {/* Order Bumps */}
      {productType.hasOrderBumps && (
        <CollapsibleSection title="Order Bump" icon="📈">
          <OrderBumpsEditor
            bumps={form.orderBumps}
            onChange={(bumps) => set("orderBumps", bumps)}
          />
        </CollapsibleSection>
      )}

      {/* Confirmation Email */}
      {productType.hasConfirmationEmail && (
        <CollapsibleSection title="Email de confirmation" icon="✉️">
          <ConfirmationEmailEditor
            subject={form.confirmationEmailSubject}
            body={form.confirmationEmailBody}
            onSubjectChange={(v) => set("confirmationEmailSubject", v)}
            onBodyChange={(v) => set("confirmationEmailBody", v)}
            productType={productType}
          />
        </CollapsibleSection>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// Reviews Editor
// ══════════════════════════════════════════════

export function ReviewsEditor({
  reviews,
  onChange,
}: {
  reviews: Review[];
  onChange: (reviews: Review[]) => void;
}) {
  const [editingName, setEditingName] = useState("");
  const [editingText, setEditingText] = useState("");
  const [editingRating, setEditingRating] = useState(5);

  function addReview() {
    if (!editingName.trim() || !editingText.trim()) return;
    const newReview: Review = {
      id: `temp-${Date.now()}`,
      productId: "",
      name: editingName,
      text: editingText,
      rating: editingRating,
      avatarUrl: null,
      position: reviews.length,
      createdAt: new Date().toISOString(),
    };
    onChange([...reviews, newReview]);
    setEditingName("");
    setEditingText("");
    setEditingRating(5);
  }

  function removeReview(idx: number) {
    onChange(reviews.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Existing reviews */}
      {reviews.map((review, idx) => (
        <div key={review.id} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <Avatar src={review.avatarUrl} alt={review.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mt-0.5 text-xs font-semibold text-gray-900">{review.name}</p>
            <p className="text-xs text-gray-500">{review.text}</p>
          </div>
          <button
            onClick={() => removeReview(idx)}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* Add new review form */}
      <div className="space-y-2 rounded-xl border border-dashed border-gray-300 p-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setEditingRating(star)}
              className="p-0.5"
            >
              <Star
                size={16}
                className={star <= editingRating ? "fill-amber-400 text-amber-400" : "text-gray-300"}
              />
            </button>
          ))}
        </div>
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          placeholder="Nom du client"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
        />
        <textarea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          placeholder="Son avis..."
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={addReview}
          disabled={!editingName.trim() || !editingText.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          <Plus size={14} />
          Ajouter un avis
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Order Bumps Editor
// ══════════════════════════════════════════════

function OrderBumpsEditor({
  bumps,
  onChange,
}: {
  bumps: OrderBump[];
  onChange: (bumps: OrderBump[]) => void;
}) {
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [editingPrice, setEditingPrice] = useState("");
  const [editingFileUrl, setEditingFileUrl] = useState("");
  const [editingFileName, setEditingFileName] = useState("");

  function addBump() {
    if (!editingTitle.trim() || !editingPrice) return;
    const newBump: OrderBump = {
      id: `temp-${Date.now()}`,
      productId: "",
      title: editingTitle,
      description: editingDesc || null,
      price: parseInt(editingPrice) || 0,
      fileUrl: editingFileUrl || null,
      fileName: editingFileName || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    onChange([...bumps, newBump]);
    setEditingTitle("");
    setEditingDesc("");
    setEditingPrice("");
    setEditingFileUrl("");
    setEditingFileName("");
  }

  function removeBump(idx: number) {
    onChange(bumps.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {bumps.map((bump, idx) => (
        <div key={bump.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900">{bump.title}</p>
              {bump.description && <p className="text-xs text-gray-500">{bump.description}</p>}
              <p className="mt-0.5 text-xs font-bold text-teal-600">{bump.price.toLocaleString("fr-FR")} FCFA</p>
            </div>
            <button
              onClick={() => removeBump(idx)}
              className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {bump.fileName && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs text-gray-500">
              <FileText size={12} />
              <span className="truncate">{bump.fileName}</span>
            </div>
          )}
        </div>
      ))}

      <div className="space-y-2 rounded-xl border border-dashed border-gray-300 p-3">
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          placeholder="Titre du bump (ex: Vidéo bonus)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
        />
        <input
          type="text"
          value={editingDesc}
          onChange={(e) => setEditingDesc(e.target.value)}
          placeholder="Description (optionnel)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
        />
        <input
          type="number"
          value={editingPrice}
          onChange={(e) => setEditingPrice(e.target.value)}
          placeholder="Prix (FCFA)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
        />
        <FileUploadButton
          label="Fichier digital (optionnel)"
          accept=".pdf,.zip,.rar,.epub,.mp3,.mp4,.mov,.png,.jpg,.jpeg,.webp,.gif"
          maxSizeMB={50}
          variant="file"
          currentFileName={editingFileName || null}
          onUpload={(url, name) => {
            setEditingFileUrl(url);
            setEditingFileName(name);
          }}
        />
        <button
          type="button"
          onClick={addBump}
          disabled={!editingTitle.trim() || !editingPrice}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          <Plus size={14} />
          Ajouter un bump
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Confirmation Email Editor
// ══════════════════════════════════════════════

const EMAIL_VARIABLES = [
  { token: "{customerName}", label: "Nom client", example: "Amadou" },
  { token: "{productName}", label: "Nom produit", example: "Guide SEO" },
  { token: "{productFiles}", label: "Lien fichier", example: '<a href="#">Télécharger</a>' },
  { token: "{sellerName}", label: "Ton nom", example: "Mon Shop" },
] as const;

export const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  SALE: {
    subject: "Ta commande de {productName} est prête !",
    body: "Salut {customerName} !\n\nMerci pour ton achat de {productName}.\n\nVoici ton fichier :\n{productFiles}\n\nBonne lecture !\n— {sellerName}",
  },
  BOOKING: {
    subject: "Ta réservation pour {productName} est confirmée !",
    body: "Salut {customerName} !\n\nTa réservation pour {productName} est bien confirmée.\n\nTu recevras un rappel avant la séance. Si tu as des questions, n'hésite pas à me contacter.\n\nÀ très vite !\n— {sellerName}",
  },
  PAYMENT: {
    subject: "Paiement reçu — merci {customerName} !",
    body: "Salut {customerName} !\n\nTon paiement a bien été reçu. Merci beaucoup pour ta confiance !\n\nSi tu as la moindre question, n'hésite pas à me contacter.\n\n— {sellerName}",
  },
  DONATION: {
    subject: "Merci pour ton soutien {customerName} !",
    body: "Salut {customerName} !\n\nUn immense merci pour ta générosité et ton soutien. Ça compte énormément pour moi !\n\nMerci du fond du cœur.\n— {sellerName}",
  },
  FUNDRAISER: {
    subject: "Merci pour ta participation {customerName} !",
    body: "Salut {customerName} !\n\nUn grand merci pour ta participation à la cagnotte. Grâce à toi, on se rapproche de l'objectif !\n\nMerci du fond du cœur.\n— {sellerName}",
  },
  FORMATION: {
    subject: "Bienvenue dans ta formation {productName} !",
    body: "Salut {customerName} !\n\nMerci pour ton achat de {productName}.\n\nTon accès à la formation a été activé. Tu vas recevoir un email de Systeme.io avec tes identifiants de connexion.\n\nBonne formation !\n— {sellerName}",
  },
  LEAD_MAGNET: {
    subject: "Voici ton contenu : {productName}",
    body: "Salut {customerName} !\n\nMerci pour ton inscription. Voici ton contenu :\n{productFiles}\n\nJ'espère que ça te sera utile. N'hésite pas à me faire un retour !\n\nÀ bientôt,\n— {sellerName}",
  },
  WAITING_LIST: {
    subject: "Tu es inscrit(e) à {productName} !",
    body: "Salut {customerName} !\n\nTon inscription à {productName} est confirmée. Tu seras parmi les premiers informés dès que ce sera disponible.\n\nReste connecté(e) !\n— {sellerName}",
  },
};

export function ConfirmationEmailEditor({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  productType,
}: {
  subject: string;
  body: string;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  productType: ProductTypeDefinition;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  function insertVariable(token: string) {
    const textarea = bodyRef.current;
    if (!textarea) {
      onBodyChange(body + token);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + token + body.slice(end);
    onBodyChange(newBody);
    // Restore cursor after token
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + token.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  function restoreDefault() {
    const tpl = DEFAULT_TEMPLATES[productType.type] || DEFAULT_TEMPLATES.SALE;
    onSubjectChange(tpl.subject);
    onBodyChange(tpl.body);
  }

  // Build preview with replaced tokens
  function getPreviewHtml(text: string) {
    let html = text;
    for (const v of EMAIL_VARIABLES) {
      html = html.replace(new RegExp(v.token.replace(/[{}]/g, "\\$&"), "g"), `<strong style="color:#0D9488">${v.example}</strong>`);
    }
    return DOMPurify.sanitize(html.replace(/\n/g, "<br>"), { ALLOWED_TAGS: ["br", "strong", "em", "b", "i"], ALLOWED_ATTR: ["style"] });
  }

  return (
    <div className="space-y-3">
      <Input
        label="Sujet de l'email"
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
        placeholder={DEFAULT_TEMPLATES[productType.type]?.subject || "Sujet..."}
      />

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Contenu</label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
          >
            <Eye size={12} />
            {showPreview ? "Éditer" : "Aperçu"}
          </button>
        </div>

        {showPreview ? (
          <div className="min-h-[160px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {subject && (
              <p className="mb-2 border-b border-gray-200 pb-2 text-xs font-bold text-gray-900">
                Sujet : <span dangerouslySetInnerHTML={{ __html: getPreviewHtml(subject) }} />
              </p>
            )}
            <div dangerouslySetInnerHTML={{ __html: getPreviewHtml(body || DEFAULT_TEMPLATES[productType.type]?.body || "") }} />
          </div>
        ) : (
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            rows={6}
            placeholder={DEFAULT_TEMPLATES[productType.type]?.body || "Contenu de l'email..."}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        )}
      </div>

      {/* Clickable variable buttons */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-500">Clique pour insérer une variable :</p>
        <div className="flex flex-wrap gap-1.5">
          {EMAIL_VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => insertVariable(v.token)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={restoreDefault}
        className="text-xs font-medium text-teal-600 hover:text-teal-700"
      >
        Restaurer le template par défaut
      </button>
    </div>
  );
}

