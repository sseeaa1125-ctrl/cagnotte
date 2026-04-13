"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/lib/adminApi";
import { Check, X, Loader2, Save, RefreshCw } from "lucide-react";

interface OperatorCatalog {
  id: string;
  name: string;
}

interface CountryCatalog {
  code: string;
  name: string;
  flag: string;
}

interface PaymentMethodConfig {
  activeCountries: string[];
  countryOperators: Record<string, string[]>;
}

interface Catalog {
  countries: CountryCatalog[];
  operators: OperatorCatalog[];
  possibleOperators: Record<string, string[]>;
}

interface ApiResponse {
  config: PaymentMethodConfig;
  catalog: Catalog;
}

export default function AdminPaymentMethodsPage() {
  const [config, setConfig] = useState<PaymentMethodConfig | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi<ApiResponse>("/api/admin/payment-methods");
      setConfig(data.config);
      setCatalog(data.catalog);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  function toggleCountry(code: string) {
    if (!config || !catalog) return;
    if (code === "OTHER") return; // OTHER toujours actif

    const isActive = config.activeCountries.includes(code);
    const newConfig = { ...config };

    if (isActive) {
      newConfig.activeCountries = newConfig.activeCountries.filter((c) => c !== code);
      const { [code]: _, ...rest } = newConfig.countryOperators;
      newConfig.countryOperators = rest;
    } else {
      newConfig.activeCountries = [...newConfig.activeCountries, code];
      // Activer seulement card par défaut
      newConfig.countryOperators = {
        ...newConfig.countryOperators,
        [code]: ["card"],
      };
    }

    setConfig(newConfig);
    setDirty(true);
    setSuccess(false);
  }

  function toggleOperator(countryCode: string, operatorId: string) {
    if (!config) return;
    if (operatorId === "card") return; // card toujours actif

    const ops = config.countryOperators[countryCode] || ["card"];
    const isActive = ops.includes(operatorId);
    const newOps = isActive
      ? ops.filter((o) => o !== operatorId)
      : [...ops, operatorId];

    setConfig({
      ...config,
      countryOperators: {
        ...config.countryOperators,
        [countryCode]: newOps,
      },
    });
    setDirty(true);
    setSuccess(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await adminApi("/api/admin/payment-methods", {
        method: "PUT",
        body: config,
      });
      setSuccess(true);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!config || !catalog) {
    return (
      <div className="py-10 text-center text-gray-400">
        <p>Impossible de charger la configuration</p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          onClick={fetchConfig}
          className="mt-4 rounded-xl bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const operatorMap = Object.fromEntries(catalog.operators.map((o) => [o.id, o.name]));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Modes de paiement</h1>
          <p className="text-sm text-gray-400 mt-1">
            Active ou désactive les pays et opérateurs de paiement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfig}
            className="flex items-center gap-2 rounded-xl bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} />
            Recharger
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              dirty
                ? "bg-teal-600 text-white hover:bg-teal-500"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-teal-500/10 border border-teal-500/20 px-4 py-3 text-sm text-teal-400">
          Configuration sauvegardée avec succès
        </div>
      )}

      {/* Countries */}
      <div className="space-y-4">
        {catalog.countries.map((country) => {
          const isActive = config.activeCountries.includes(country.code);
          const isOther = country.code === "OTHER";
          const possibleOps = catalog.possibleOperators[country.code] || ["card"];
          const activeOps = config.countryOperators[country.code] || [];

          return (
            <div
              key={country.code}
              className={`rounded-2xl border transition-colors ${
                isActive
                  ? "border-gray-700 bg-gray-900"
                  : "border-gray-800/50 bg-gray-950"
              }`}
            >
              {/* Country header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{country.flag}</span>
                  <div>
                    <span className="font-medium text-white">{country.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{country.code}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleCountry(country.code)}
                  disabled={isOther}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isOther
                      ? "bg-teal-600/50 cursor-not-allowed"
                      : isActive
                      ? "bg-teal-600"
                      : "bg-gray-700"
                  }`}
                  title={isOther ? "Toujours actif (fallback carte)" : undefined}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Operators (only if country is active) */}
              {isActive && (
                <div className="border-t border-gray-800 px-5 py-3">
                  <p className="text-xs text-gray-500 mb-3">Opérateurs actifs</p>
                  <div className="flex flex-wrap gap-2">
                    {possibleOps.map((opId) => {
                      const isOpActive = activeOps.includes(opId);
                      const isCard = opId === "card";
                      return (
                        <button
                          key={opId}
                          onClick={() => toggleOperator(country.code, opId)}
                          disabled={isCard}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                            isCard
                              ? "bg-teal-600/20 text-teal-300 cursor-not-allowed border border-teal-600/30"
                              : isOpActive
                              ? "bg-teal-600/20 text-teal-300 border border-teal-600/30 hover:bg-teal-600/30"
                              : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
                          }`}
                        >
                          {isOpActive || isCard ? (
                            <Check size={14} className="text-teal-400" />
                          ) : (
                            <X size={14} className="text-gray-500" />
                          )}
                          {operatorMap[opId] || opId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 rounded-xl bg-gray-900/50 border border-gray-800 px-5 py-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-400">Note :</strong> La carte bancaire est toujours active pour tous les pays.
          Le pays &quot;Autre&quot; sert de fallback et ne peut pas être désactivé.
          Les changements prennent effet immédiatement après la sauvegarde — aucun redéploiement nécessaire.
        </p>
      </div>
    </div>
  );
}
