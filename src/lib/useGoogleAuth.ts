"use client";

import { useEffect, useCallback, useRef } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup" | "redirect";
            callback: (response: { code: string; error?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface UseGoogleAuthOptions {
  onCode: (code: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to load Google Identity Services and trigger a popup-based OAuth flow.
 * Uses `initCodeClient` (authorization code flow) which opens a real Google
 * consent popup — much more reliable than `prompt()` (One Tap).
 * Calls `onCode(authorizationCode)` when the user grants access.
 */
export function useGoogleAuth({ onCode, onError }: UseGoogleAuthOptions) {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Load the GIS script once
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (document.getElementById("google-gsi-script")) return;

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const trigger = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID manquant");
      onErrorRef.current?.("Configuration Google manquante");
      return;
    }

    const tryInit = () => {
      if (!window.google?.accounts?.oauth2) return false;

      try {
        const client = window.google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: (response) => {
            if (response.error) {
              const msg = response.error === "popup_closed_by_user"
                ? "Connexion annulée"
                : response.error === "access_denied"
                ? "Accès refusé par Google"
                : `Erreur Google : ${response.error}`;
              onErrorRef.current?.(msg);
              return;
            }
            if (response.code) {
              onCodeRef.current(response.code);
            }
          },
        });

        client.requestCode();
      } catch (err) {
        console.error("[GoogleAuth] requestCode failed:", err);
        onErrorRef.current?.("Impossible d'ouvrir Google. Vérifie que les popups sont autorisés.");
      }
      return true;
    };

    // Script might not be loaded yet — retry a few times
    if (tryInit()) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInit() || attempts > 20) {
        clearInterval(interval);
        if (attempts > 20) {
          onErrorRef.current?.("Impossible de charger Google. Vérifie ta connexion et réessaye.");
        }
      }
    }, 200);
  }, []);

  return { trigger };
}
