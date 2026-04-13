"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, StoreSkeleton, Skeleton } from "@/components/ui";
import { Download, CheckCircle, XCircle, FileText } from "lucide-react";

const API_URL = "";

const TEXTS = {
  loading: "Vérification du paiement...",
  title: "Ton fichier est prêt !",
  titleMulti: "Tes fichiers sont prêts !",
  downloadCta: "Télécharger",
  expired: "Ce lien de téléchargement a expiré.",
  notPaid: "Le paiement n\u2019a pas encore été confirmé.",
  notFound: "Commande introuvable.",
  error: "Une erreur est survenue.",
  limitReached: "Nombre maximum de téléchargements atteint.",
};

interface FileInfo {
  url: string;
  fileName: string;
  fileSize?: number;
}

interface CheckResponse {
  fileName?: string;
  files?: FileInfo[];
  remaining: number;
}

function DownloadContent() {
  const params = useParams<{ ref: string }>();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [remaining, setRemaining] = useState(0);

  const token = searchParams.get("token") || "";
  const baseDownloadUrl = `${API_URL}/api/orders/${params.ref}/download?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    if (!params.ref) return;

    fetch(`${API_URL}/api/orders/${params.ref}/download-check?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as CheckResponse;
          if (data.files && data.files.length > 0) {
            setFiles(data.files);
          } else {
            setFileName(data.fileName || "");
          }
          setRemaining(data.remaining);
          setStatus("ready");
        } else {
          const body = await res.json().catch(() => ({ error: TEXTS.error }));
          setErrorMsg((body as { error?: string }).error || TEXTS.error);
          setStatus("error");
        }
      })
      .catch(() => {
        setErrorMsg(TEXTS.error);
        setStatus("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ref]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-sm space-y-4 px-4 text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-5 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <XCircle size={48} className="mx-auto text-red-400" />
          <p className="mt-4 text-sm font-medium text-gray-900">{errorMsg}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const isMultiFile = files.length > 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center">
        <CheckCircle size={48} className="mx-auto text-teal-600" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {isMultiFile ? TEXTS.titleMulti : TEXTS.title}
        </h1>

        {/* Multi-file list */}
        {files.length > 0 ? (
          <div className="mt-6 space-y-2">
            {files.map((f, i) => (
              <a
                key={i}
                href={`${baseDownloadUrl}&fileIndex=${i}`}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-colors hover:border-teal-400 hover:bg-teal-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100">
                  <FileText size={18} className="text-teal-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{f.fileName}</p>
                  {f.fileSize && (
                    <p className="text-xs text-gray-400">{(f.fileSize / 1024 / 1024).toFixed(1)} Mo</p>
                  )}
                </div>
                <Download size={16} className="shrink-0 text-teal-600" />
              </a>
            ))}
          </div>
        ) : (
          <>
            {fileName && <p className="mt-2 text-sm text-gray-500">{fileName}</p>}
            <a href={baseDownloadUrl} className="mt-6 block">
              <Button size="lg" className="w-full">
                <Download size={18} className="mr-2" />
                {TEXTS.downloadCta}
              </Button>
            </a>
          </>
        )}

        {remaining > 0 && (
          <p className="mt-3 text-xs text-gray-400">
            {remaining} téléchargement{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <DownloadContent />
    </Suspense>
  );
}
