"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PICKER_TYPES } from "@/lib/productTypes";

export default function NewBlockPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <button
        onClick={() => router.push("/dashboard/blocks")}
        className="mb-6 flex items-center gap-1.5 rounded-xl py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ChevronLeft size={16} />
        Mon Store
      </button>

      <h1 className="text-2xl font-extrabold text-gray-900">
        Choisir le type de produit
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Choisis le format qui correspond le mieux à ton besoin
      </p>

      {/* Type cards */}
      <div className="mt-8 space-y-3">
        {PICKER_TYPES.map((pt, idx) => (
          <button
            key={`${pt.type}-${idx}`}
            onClick={() => {
              if (pt.type === "COMMUNITY") {
                router.push("/dashboard/communities/new");
                return;
              }
              const params = new URLSearchParams({ type: pt.type, label: pt.label });
              router.push(`/dashboard/blocks/create?${params.toString()}`);
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-teal-300 hover:shadow-sm active:scale-[0.99]"
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: pt.bgColor }}
            >
              {pt.icon.startsWith("/") ? (
                <img src={pt.icon} alt={pt.label} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                pt.icon
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">{pt.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{pt.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
