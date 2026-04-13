"use client";

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import { Loader2, AlertCircle, GraduationCap, ExternalLink } from "lucide-react";

interface SystemeioCourse {
  id: number;
  name: string;
}

interface SystemeioCourseSelectorProps {
  value: string;
  onChange: (courseId: string) => void;
}

export function SystemeioCourseSelector({ value, onChange }: SystemeioCourseSelectorProps) {
  const [courses, setCourses] = useState<SystemeioCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchCourses() {
      setLoading(true);
      setError("");
      try {
        const res = await api<{ courses: SystemeioCourse[]; error?: string }>("/api/integrations/systemeio/courses");
        if (!cancelled) {
          if (res.error) {
            setError(res.error);
          } else {
            setCourses(res.courses || []);
          }
          setFetched(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof ApiError
            ? err.message
            : "Connecte d'abord Systeme.io dans Paramètres → Intégrations";
          setError(msg);
          setFetched(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCourses();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <Loader2 size={16} className="animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Chargement des cours Systeme.io…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">{error}</p>
            <a
              href="/dashboard/settings/integrations"
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors"
            >
              Aller aux intégrations <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (fetched && courses.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <GraduationCap size={16} className="mt-0.5 shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-600">Aucun cours trouvé sur Systeme.io</p>
            <p className="mt-0.5 text-xs text-gray-400">Crée d&apos;abord un cours sur ton compte Systeme.io</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
      >
        <option value="">— Sélectionne un cours —</option>
        {courses.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
      </select>
      {value && (
        <p className="text-xs text-teal-600 font-medium ml-1">
          ✓ Après achat, l&apos;acheteur sera automatiquement inscrit à ce cours
        </p>
      )}
      {!value && (
        <p className="text-xs text-gray-400 ml-1">
          L&apos;acheteur sera inscrit automatiquement au cours après paiement
        </p>
      )}
    </div>
  );
}
