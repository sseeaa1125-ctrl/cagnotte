"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { AdminEditForm } from "./_AdminEditForm";

interface CagnotteFullResponse {
  id: string;
  title: string;
  slug: string | null;
  config: Record<string, unknown>;
}

export default function AdminCagnotteModifierPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [data, setData] = React.useState<CagnotteFullResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        // Le endpoint admin /:id renvoie déjà le config complet pour l'affichage
        // read-only. On réutilise la même ressource pour alimenter l'éditeur.
        const res = await adminApi<{ cagnotte: CagnotteFullResponse }>(
          `/api/admin/cagnottes/${id}`,
        );
        if (!cancelled) setData(res.cagnotte);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof AdminApiError
              ? err.message
              : "Impossible de charger la cagnotte",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        ID de cagnotte manquant
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/cagnottes/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary"
        >
          <ArrowLeft size={16} />
          Retour au détail
        </Link>
      </div>

      <div>
        <h1 className="font-headings text-2xl font-black text-primary">
          Modifier la cagnotte
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Édition admin — tous les champs. Action tracée dans{" "}
          <Link href="/admin/logs" className="text-primary underline">
            le journal
          </Link>
          .
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <AdminEditForm
          initial={{
            id: data.id,
            title: data.title,
            config: data.config,
          }}
        />
      ) : null}
    </div>
  );
}
