"use client";

import * as React from "react";
import { Bell, Send, Search } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ── Types ──
interface SellerResult {
  id: string;
  displayName: string;
  slug: string;
  email: string;
}

export default function AdminNotificationsPage() {
  const [mode, setMode] = React.useState<"broadcast" | "targeted">("broadcast");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Targeted mode
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SellerResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selectedSeller, setSelectedSeller] = React.useState<SellerResult | null>(null);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setSearching(true);
      try {
        const res = await adminApi<{ sellers: SellerResult[] }>(
          `/api/admin/notifications/sellers/search?q=${encodeURIComponent(debouncedQuery)}`,
        );
        if (!cancelled) setSearchResults(res.sellers);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function resetForm() {
    setTitle("");
    setBody("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedSeller(null);
  }

  // Broadcast confirmation
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  function handleSendClick() {
    setError(null);
    setResult(null);

    if (!title.trim() || !body.trim()) {
      setError("Le titre et le message sont requis.");
      return;
    }

    if (mode === "targeted" && !selectedSeller) {
      setError("Selectionnez un vendeur pour l'envoi cible.");
      return;
    }

    // Show confirmation for broadcast mode
    if (mode === "broadcast") {
      setConfirmOpen(true);
      return;
    }

    doSend();
  }

  async function doSend() {
    setConfirmOpen(false);
    setSending(true);
    try {
      if (mode === "broadcast") {
        const res = await adminApi<{ recipientCount: number; created: number; skipped: number }>(
          "/api/admin/notifications/broadcast",
          { method: "POST", body: { title: title.trim(), body: body.trim() } },
        );
        setResult(
          `Notification envoyee a ${res.created} vendeur${res.created > 1 ? "s" : ""} sur ${res.recipientCount} actif${res.recipientCount > 1 ? "s" : ""}.`,
        );
      } else {
        const res = await adminApi<{ created: boolean }>(
          "/api/admin/notifications/send",
          {
            method: "POST",
            body: {
              sellerId: selectedSeller!.id,
              title: title.trim(),
              body: body.trim(),
            },
          },
        );
        setResult(
          res.created
            ? `Notification envoyee a ${selectedSeller!.displayName}.`
            : `Notification deja envoyee a ${selectedSeller!.displayName} (doublon).`,
        );
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headings text-2xl font-black text-primary">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envoyer des notifications aux vendeurs
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-primary whitespace-nowrap">Mode :</span>
          <Toggle
            checked={mode === "targeted"}
            onChange={(checked) => {
              setMode(checked ? "targeted" : "broadcast");
              setError(null);
              setResult(null);
            }}
            label={mode === "broadcast" ? "Diffusion generale" : "Envoi cible"}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {mode === "broadcast"
            ? "Envoyer a tous les vendeurs actifs"
            : "Envoyer a un vendeur specifique"}
        </span>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-background p-4 sm:p-6 shadow-sm space-y-4">
        {/* Targeted: seller search */}
        {mode === "targeted" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">
              Vendeur
            </label>
            {selectedSeller ? (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Bell size={16} className="text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary truncate">
                    {selectedSeller.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{selectedSeller.slug} - {selectedSeller.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeller(null);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Rechercher par email, slug ou nom..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {(searchResults.length > 0 || searching) && searchQuery.length >= 2 ? (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                    {searching ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        Recherche...
                      </div>
                    ) : (
                      searchResults.map((seller) => (
                        <button
                          key={seller.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedSeller(seller);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-primary">
                              {seller.displayName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{seller.slug} - {seller.email}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Title */}
        <Input
          label="Titre"
          placeholder="Titre de la notification"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />

        {/* Body */}
        <Textarea
          label="Message"
          placeholder="Contenu de la notification..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />

        {/* Error / Success */}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {result}
          </div>
        ) : null}

        {/* Send */}
        <Button
          onClick={handleSendClick}
          loading={sending}
          disabled={sending}
          iconLeft={<Send size={16} />}
        >
          {mode === "broadcast" ? "Envoyer a tous" : "Envoyer"}
        </Button>
      </div>

      {/* Broadcast confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmer la diffusion"
        message={
          <div className="space-y-2">
            <p>
              Vous etes sur le point d&apos;envoyer une notification a{" "}
              <span className="font-bold">tous les vendeurs actifs</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Titre : <span className="font-medium">{title}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cette action est irreversible.
            </p>
          </div>
        }
        confirmLabel="Envoyer a tous"
        tone="danger"
        onConfirm={doSend}
      />
    </div>
  );
}
