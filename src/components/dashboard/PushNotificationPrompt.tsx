"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { api } from "@/lib/api";

const DISMISSED_KEY = "izy-push-dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't show if: no SW support, already subscribed, already dismissed, or permission denied
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      // Already granted — check if we have a subscription registered
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (!sub) setVisible(true); // Permission granted but no subscription — re-subscribe
        });
      });
      return;
    }

    // Permission is "default" — show prompt unless dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Wait a bit before showing the prompt (don't interrupt immediately)
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get VAPID public key from backend
      const { publicKey } = await api<{ publicKey: string }>("/api/notifications/vapid-public-key");
      if (!publicKey) throw new Error("VAPID key missing");

      // 2. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      // 3. Subscribe to push via service worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // 4. Send subscription to backend
      const subJson = subscription.toJSON();
      await api("/api/notifications/subscribe", {
        method: "POST",
        body: {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        },
      });

      setVisible(false);
    } catch (err) {
      console.warn("[Push] Erreur subscription:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm lg:bottom-6 lg:left-auto lg:right-6 animate-slide-up-bar">
      <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-lg border border-gray-100">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50">
          <Bell size={20} className="text-teal-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
            Reçois tes notifications
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Sois alerté(e) instantanément à chaque vente, réservation ou don.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Activation..." : "Activer"}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-full px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
