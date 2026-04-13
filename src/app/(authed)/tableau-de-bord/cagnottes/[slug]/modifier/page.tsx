import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EDIT_LABELS } from "@/lib/constants";
import { EditForm } from "./_EditForm";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /tableau-de-bord/cagnottes/[slug]/modifier.
//
// Server component. Reads the authed block payload (full config intact)
// via GET /api/blocks/:id after first resolving the block id from the
// public /api/cagnottes/:slug endpoint. Enforces server-side owner check
// via /api/auth/me — non-owner → notFound().
//
// The page shows the current slug in a READONLY disabled input. The form
// NEVER sends `slug` on PUT — see _EditForm.tsx and D-24.
// ─────────────────────────────────────────────────────────────────────────

interface MePayload {
  seller?: { id: string };
}

interface CagnottePayload {
  id: string;
  slug: string;
  seller: { id: string };
}

interface RawBlock {
  id: string;
  title: string;
  type: string;
  slug: string;
  sellerId: string;
  isActive: boolean;
  config: Record<string, unknown>;
}

async function fetchJson<T>(
  url: string,
  token: string,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function EditCagnottePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) {
    redirect(
      `/connexion?next=/tableau-de-bord/cagnottes/${slug}/modifier`,
    );
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [me, cagnotte] = await Promise.all([
    fetchJson<MePayload>(`${backendUrl}/api/auth/me`, token),
    fetchJson<CagnottePayload>(
      `${backendUrl}/api/cagnottes/${encodeURIComponent(slug)}`,
      token,
    ),
  ]);

  if (!me?.seller) {
    redirect(
      `/connexion?next=/tableau-de-bord/cagnottes/${slug}/modifier`,
    );
  }
  if (!cagnotte) notFound();

  // Owner check — server-side, before any JSX.
  if (cagnotte.seller.id !== me.seller.id) {
    notFound();
  }

  // Fetch full authed block payload (includes the full config we need to
  // preserve on PUT — subtype/occasion/cause/beneficiary/visibility/etc.).
  const blockRes = await fetchJson<{ block: RawBlock }>(
    `${backendUrl}/api/blocks/${cagnotte.id}`,
    token,
  );
  if (!blockRes?.block) notFound();
  const block = blockRes.block;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/tableau-de-bord"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} aria-hidden />
        {EDIT_LABELS.backToDashboard}
      </Link>

      <header className="mb-6">
        <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {EDIT_LABELS.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {EDIT_LABELS.subtitle}
        </p>
      </header>

      {/* URL (readonly — slug lock, D-24) */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {EDIT_LABELS.urlSection}
        </p>
        <code className="mt-2 block break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-primary">
          cagnottes.sn/c/{block.slug}
        </code>
        <p className="mt-2 text-xs text-muted-foreground">
          {EDIT_LABELS.slugLocked}
        </p>
      </div>

      <EditForm
        initial={{
          id: block.id,
          title: block.title,
          config: block.config,
        }}
      />
    </div>
  );
}
