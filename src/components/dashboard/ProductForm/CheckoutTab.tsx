"use client";

import { Input } from "@/components/ui";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { X, FileText } from "lucide-react";
import type { TabPropsWithMultiple } from "./types";
import { SectionHeader, SuggestedAmountsEditor, CollapsibleSection, WithdrawalAlert } from "./FormHelpers";
import { ConfirmationEmailEditor } from "./OptionsTab";
import { LeadFieldEditor } from "@/components/dashboard/LeadFieldEditor";
import { SystemeioCourseSelector } from "./SystemeioCourseSelector";

export function CheckoutTab({ productType, form, set, setMultiple, addFile }: TabPropsWithMultiple) {
  let step = 1;
  const isPaid = productType.hasPrice || productType.type === "PAYMENT" || productType.type === "DONATION" || productType.type === "FUNDRAISER";

  return (
    <div className="space-y-6">
      {isPaid && <WithdrawalAlert />}

      {/* ── SALE: description + prix + prix barré + fichier ── */}
      {productType.type === "SALE" && (
        <>
          <div>
            <SectionHeader n={step++} label="Description" />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Décris ton produit en détail : contenu, bénéfices, format..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Prix" />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input label="Prix (FCFA)" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex : 5000" required />
                {form.price && parseInt(form.price) > 0 && (
                  <p className="mt-1 text-xs font-medium text-teal-600">{parseInt(form.price).toLocaleString("fr-FR")} FCFA</p>
                )}
              </div>
              <div className="flex-1">
                <Input label="Prix barré (FCFA)" type="number" value={form.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} placeholder="Optionnel" />
                {form.discountPrice && parseInt(form.discountPrice) > 0 && (
                  <p className="mt-1 text-xs text-gray-400 line-through">{parseInt(form.discountPrice).toLocaleString("fr-FR")} FCFA</p>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400">Le prix barré s&apos;affiche comme ancien prix rayé à côté du prix réel.</p>
          </div>

          <div>
            <SectionHeader n={step++} label="Fichiers digitaux" />

            {/* Liste des fichiers déjà ajoutés */}
            {form.files.length > 0 && (
              <div className="mb-3 space-y-2">
                {form.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200">
                      <FileText size={18} className="text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">{f.fileName}</p>
                      {f.fileSize && <p className="text-xs text-gray-400">{(f.fileSize / 1024 / 1024).toFixed(1)} Mo</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = form.files.filter((_, idx) => idx !== i);
                        set("files", newFiles);
                      }}
                      className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500"
                      aria-label="Supprimer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bouton ajouter un fichier */}
            <FileUploadButton
              label={form.files.length > 0 ? "Ajouter un autre fichier" : "Ajouter un fichier (PDF, ZIP, PNG, etc.)"}
              accept=".pdf,.zip,.rar,.epub,.mp3,.mp4,.mov,.png,.jpg,.jpeg,.webp,.gif"
              maxSizeMB={50}
              variant="file"
              multiple
              onUpload={(url, name) => {
                if (url) {
                  addFile({ url, fileName: name || "fichier" });
                }
              }}
            />

            {form.files.length === 0 && (
              <>
                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400">ou</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <Input label="URL de redirection (Google Drive, etc.)" type="url" value={form.redirectUrl} onChange={(e) => set("redirectUrl", e.target.value)} placeholder="https://drive.google.com/..." />
              </>
            )}
          </div>
        </>
      )}

      {/* ── FORMATION: description + prix + cours Systeme.io ── */}
      {productType.type === "FORMATION" && (
        <>
          <div>
            <SectionHeader n={step++} label="Description" />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Décris ta formation : contenu, modules, ce que l'élève va apprendre..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Prix" />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input label="Prix (FCFA)" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex : 15000" required />
                {form.price && parseInt(form.price) > 0 && (
                  <p className="mt-1 text-xs font-medium text-teal-600">{parseInt(form.price).toLocaleString("fr-FR")} FCFA</p>
                )}
              </div>
              <div className="flex-1">
                <Input label="Prix barré (FCFA)" type="number" value={form.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} placeholder="Optionnel" />
                {form.discountPrice && parseInt(form.discountPrice) > 0 && (
                  <p className="mt-1 text-xs text-gray-400 line-through">{parseInt(form.discountPrice).toLocaleString("fr-FR")} FCFA</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <SectionHeader n={step++} label="Cours Systeme.io" />
            <SystemeioCourseSelector
              value={form.systemeioCourseId}
              onChange={(v) => set("systemeioCourseId", v)}
            />
          </div>

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
        </>
      )}

      {/* ── BOOKING: description + prix + durée + lieu + email confirmation ── */}
      {productType.type === "BOOKING" && (
        <>
          <div>
            <SectionHeader n={step++} label="Description (optionnel)" />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Décris ta séance : déroulement, prérequis, ce que le client va apprendre..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Tarif" />
            <Input label="" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex : 15000" required />
            {form.price && parseInt(form.price) > 0 && (
              <p className="mt-1 text-xs font-medium text-teal-600">{parseInt(form.price).toLocaleString("fr-FR")} FCFA</p>
            )}
          </div>

          <div>
            <SectionHeader n={step++} label="Détails de la séance" />
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input label="Durée (minutes)" type="number" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="60" required />
              </div>
              <div className="flex-1">
                <Input label="Lieu (optionnel)" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex : Zoom, Google Meet, Dakar..." />
              </div>
            </div>
          </div>

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
        </>
      )}

      {/* ── PAYMENT: montants suggérés ── */}
      {productType.type === "PAYMENT" && (
        <>
          <div>
            <SectionHeader n={step++} label="Montants suggérés" />
            <SuggestedAmountsEditor
              value={form.suggestedAmounts}
              onChange={(v) => set("suggestedAmounts", v)}
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Montant minimum" />
            <Input label="Montant minimum (FCFA)" type="number" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} placeholder="500" inputMode="numeric" />
            <p className="mt-1 text-[10px] text-gray-400 ml-1">Minimum 500 FCFA</p>
          </div>
        </>
      )}

      {/* ── DONATION: montants suggérés + message de remerciement ── */}
      {productType.type === "DONATION" && (
        <>
          <div>
            <SectionHeader n={step++} label="Montants suggérés" />
            <SuggestedAmountsEditor
              value={form.suggestedAmounts}
              onChange={(v) => set("suggestedAmounts", v)}
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Montant minimum" />
            <Input label="Montant minimum (FCFA)" type="number" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} placeholder="500" inputMode="numeric" />
            <p className="mt-1 text-[10px] text-gray-400 ml-1">Minimum 500 FCFA</p>
          </div>

          <div>
            <SectionHeader n={step++} label="Message de remerciement" />
            <p className="mb-2 text-xs text-gray-400">Ce message sera affiché après un don réussi</p>
            <textarea
              value={form.thankYouMessage}
              onChange={(e) => set("thankYouMessage", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Merci infiniment pour ton soutien ! Chaque don compte et me permet de continuer..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </>
      )}

      {/* ── FUNDRAISER: objectif + date fin + montants suggérés + message remerciement ── */}
      {productType.type === "FUNDRAISER" && (
        <>
          <div>
            <SectionHeader n={step++} label="Objectif de la cagnotte" />
            <Input label="Montant objectif (FCFA)" type="number" value={form.goalAmount} onChange={(e) => set("goalAmount", e.target.value)} placeholder="Ex : 500000" inputMode="numeric" required />
            {form.goalAmount && parseInt(form.goalAmount) > 0 && (
              <p className="mt-1 text-xs font-medium text-red-600">{parseInt(form.goalAmount).toLocaleString("fr-FR")} FCFA</p>
            )}
            <p className="mt-1 text-[10px] text-gray-400 ml-1">Minimum 1 000 FCFA. C&apos;est le montant que tu souhaites atteindre.</p>
          </div>

          <div>
            <SectionHeader n={step++} label="Date de fin (optionnel)" />
            <Input label="Date de fin" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            <p className="mt-1 text-[10px] text-gray-400 ml-1">Laisse vide si la cagnotte n&apos;a pas de date limite.</p>
          </div>

          <div>
            <SectionHeader n={step++} label="Options d'affichage" />
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("showDonorCount", !form.showDonorCount)}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.showDonorCount ? "bg-teal-600" : "bg-gray-300"}`}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.showDonorCount ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-gray-700">Afficher le nombre de participants</span>
            </label>
          </div>

          <div>
            <SectionHeader n={step++} label="Montants suggérés" />
            <SuggestedAmountsEditor
              value={form.suggestedAmounts}
              onChange={(v) => set("suggestedAmounts", v)}
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Montant minimum" />
            <Input label="Montant minimum (FCFA)" type="number" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} placeholder="500" inputMode="numeric" />
            <p className="mt-1 text-[10px] text-gray-400 ml-1">Minimum 500 FCFA</p>
          </div>

          <div>
            <SectionHeader n={step++} label="Message de remerciement" />
            <p className="mb-2 text-xs text-gray-400">Ce message sera affiché après une participation réussie</p>
            <textarea
              value={form.thankYouMessage}
              onChange={(e) => set("thankYouMessage", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Merci pour ta participation ! Chaque contribution nous rapproche de l'objectif..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </>
      )}

      {/* ── WAITING_LIST: description + prix (optionnel) + champs formulaire + limites ── */}
      {productType.type === "WAITING_LIST" && (
        <>
          <div>
            <SectionHeader n={step++} label="Description" />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Décris ta liste d'attente : ce à quoi les inscrits auront accès..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Tarif (optionnel)" />
            <p className="mb-2 text-xs text-gray-400">Laisse vide ou à 0 pour une inscription gratuite</p>
            <Input label="" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0 = gratuit" />
            {form.price && parseInt(form.price) > 0 && (
              <p className="mt-1 text-xs font-medium text-teal-600">{parseInt(form.price).toLocaleString("fr-FR")} FCFA</p>
            )}
          </div>

          <div>
            <SectionHeader n={step++} label="Champs du formulaire" />
            <LeadFieldEditor
              fields={form.leadFields}
              onChange={(fields) => setMultiple({ leadFields: fields })}
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Limites" />
            <div className="space-y-3">
              <Input label="Nombre max d'inscrits (optionnel)" type="number" value={form.maxSubscribers} onChange={(e) => set("maxSubscribers", e.target.value)} placeholder="Illimité si vide" />
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setMultiple({ showSubscriberCount: !form.showSubscriberCount })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${form.showSubscriberCount ? "bg-teal-600" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.showSubscriberCount ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-gray-700">Afficher le nombre d&apos;inscrits</span>
              </label>
            </div>
          </div>

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
        </>
      )}

      {/* ── LEAD_MAGNET: description + champs formulaire + fichier ── */}
      {productType.type === "LEAD_MAGNET" && (
        <>
          <div>
            <SectionHeader n={step++} label="Description" />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Décris le contenu gratuit : ce que le visiteur va recevoir..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Champs du formulaire" />
            <LeadFieldEditor
              fields={form.leadFields}
              onChange={(fields) => setMultiple({ leadFields: fields })}
            />
          </div>

          <div>
            <SectionHeader n={step++} label="Fichiers à envoyer" />
            
            {/* Liste des fichiers déjà ajoutés */}
            {form.files.length > 0 && (
              <div className="mb-3 space-y-2">
                {form.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200">
                      <FileText size={18} className="text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">{f.fileName}</p>
                      {f.fileSize && <p className="text-xs text-gray-400">{(f.fileSize / 1024 / 1024).toFixed(1)} Mo</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = form.files.filter((_, idx) => idx !== i);
                        set("files", newFiles);
                      }}
                      className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500"
                      aria-label="Supprimer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <FileUploadButton
              label={form.files.length > 0 ? "Ajouter un autre fichier" : "Fichier digital (PDF, image, etc.)"}
              accept=".pdf,.zip,.rar,.epub,.mp3,.mp4,.mov,.png,.jpg,.jpeg,.webp,.gif"
              maxSizeMB={50}
              variant="file"
              multiple
              onUpload={(url, name) => {
                if (url) {
                  addFile({ url, fileName: name || "fichier" });
                }
              }}
            />

            {form.files.length === 0 && (
              <>
                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400">ou</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <Input label="URL de redirection" type="url" value={form.redirectUrl} onChange={(e) => set("redirectUrl", e.target.value)} placeholder="https://drive.google.com/..." />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
