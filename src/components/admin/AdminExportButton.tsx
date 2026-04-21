"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

/**
 * Bouton générique pour télécharger un CSV depuis un endpoint admin.
 * Utilise `fetch` avec credentials:include pour que le cookie httpOnly
 * passe, puis crée un blob + anchor invisible pour déclencher le download.
 *
 * Le `path` doit être un endpoint admin GET qui renvoie `text/csv`.
 */
export interface AdminExportButtonProps {
  path: string; // ex: "/api/admin/orders/export.csv?status=PAID"
  filename: string; // ex: "orders-2026-04-21.csv"
  label?: string;
  disabled?: boolean;
  className?: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function AdminExportButton({
  path,
  filename,
  label = "Exporter CSV",
  disabled,
  className,
}: AdminExportButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}${path}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Export téléchargé", "success");
    } catch (err) {
      toast(
        `Erreur lors de l'export : ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="md"
      iconLeft={<Download size={16} />}
      onClick={handleClick}
      loading={loading}
      disabled={disabled || loading}
      className={className}
    >
      {label}
    </Button>
  );
}
