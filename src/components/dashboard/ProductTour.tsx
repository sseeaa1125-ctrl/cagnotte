"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { usePathname, useRouter } from "next/navigation";
import "driver.js/dist/driver.css";

declare global {
  interface Window {
    startIzyTour?: () => void;
  }
}

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Expose a function to manually trigger the tour
    window.startIzyTour = () => {
      localStorage.removeItem("izy-tour-completed");
      if (pathname !== "/dashboard/blocks") {
        router.push("/dashboard/blocks");
      } else {
        window.location.reload();
      }
    };
    if (localStorage.getItem("izy-tour-completed") === "true") {
      return;
    }
    // On desktop, we can show it anywhere or just on blocks. 
    // Wait, the user said "sur pc montre pour toute les pages" meaning he wants it active on all PC pages.
    // If we simply remove the pathname restriction, we need target elements to exist. 
    // Actually, highlighting the sidebar for Inbox, Settings, etc. is best. Let's find those IDs.

    // Don't restart if already active
    if (document.querySelector(".driver-popover")) {
      return;
    }

    const startTour = setTimeout(() => {

      const isMobile = window.innerWidth < 1024;

      // Verify that the element we want to attach to actually exists
      const targetElement = isMobile ? document.querySelector("#tour-add-block") : document.querySelector("#tour-sidebar-blocks");
      if (!targetElement) {
        return;
      }

      
      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: false, // Don't close when clicking outside
        allowKeyboardControl: true, // Let them escape/navigate if they want
        showButtons: ["next", "previous", "close"],
        doneBtnText: "Terminer",
        nextBtnText: "Suivant",
        prevBtnText: "Précédent",
        progressText: "{{current}} sur {{total}}",
        popoverClass: "izy-driver-popover",
        // This makes sure the user cannot click the element highlighted
        onHighlightStarted: (el) => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = "none";
          }
        },
        onDeselected: (el) => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = "";
          }
        },
        onCloseClick: () => {
          localStorage.setItem("izy-tour-completed", "true");
          driverObj.destroy();
        },
        onDestroyed: () => {
          localStorage.setItem("izy-tour-completed", "true");
        },
        steps: [
          {
            element: isMobile ? "#tour-add-block" : "#tour-sidebar-blocks",
            popover: {
              title: "Bienvenue sur ton espace !",
              description: "Ici c'est la section Blocks, le cœur de ta boutique où tu ajoutes tes produits.",
              side: (isMobile ? "bottom" : "right") as "bottom" | "right",
              align: "start" as const,
            },
          },
          ...(isMobile ? [] : [
            {
              element: "#tour-add-block",
              popover: {
                title: "Ajoute tes blocs",
                description: "Clique ici pour ajouter tes produits, services, ou liens.",
                side: "bottom" as const,
                align: "start" as const,
              },
              onHighlightStarted: (el: Element | undefined) => {
                // Ensure we are on the boutique tab
                const boutiqueTab = document.getElementById("tour-boutique-tab");
                if (boutiqueTab) boutiqueTab.click();
              }
            },
            {
              element: "#tour-sidebar-inbox",
              popover: {
                title: "Gère tes messages & commandes",
                description: "Retrouve ici toutes les interactions avec tes clients et tes ventes.",
                side: "right" as const,
                align: "start" as const,
              },
            },
            {
              element: "#tour-sidebar-analytics",
              popover: {
                title: "Suis tes statistiques",
                description: "Analyse tes visites et l'engagement de ton audience.",
                side: "right" as const,
                align: "start" as const,
              },
            },
            {
              element: "#tour-sidebar-settings",
              popover: {
                title: "Paramètres",
                description: "Configure tes options de paiement, ton domaine et tes infos.",
                side: "right" as const,
                align: "start" as const,
              },
            }
          ]),
          {
            element: "#tour-design-tab", 
            popover: {
              title: "Personnaliser ton design",
              description: "N'oublie pas l'onglet Design pour changer les couleurs et polices.",
              side: (isMobile ? "bottom" : "right") as "bottom" | "right",
              align: "start" as const,
              onNextClick: () => {
                if (isMobile) {
                  localStorage.setItem("izy-tour-completed", "true");
                }
                driverObj.moveNext();
              }
            },
            onHighlightStarted: (el: Element | undefined) => {
              if (el) {
                // Let's actually switch to the Design tab automatically!
                const designTab = document.getElementById("tour-design-tab");
                if (designTab) designTab.click();
              }
            }
          },
          ...(!isMobile ? [
            {
              element: "#tour-phone-preview",
              popover: {
                title: "Aperçu en direct",
                description: "Visualise en temps réel à quoi ressemble ton store sur mobile.",
                side: "left" as const,
                align: "start" as const,
              },
            },
            {
              element: "#tour-my-store",
              popover: {
                title: "Partage ton lien",
                description: "Clique ici pour visiter ton store public et récupérer le lien pour tes réseaux.",
                side: "bottom" as const,
                align: "center" as const,
                onNextClick: () => {
                  localStorage.setItem("izy-tour-completed", "true");
                  driverObj.moveNext();
                }
              },
            }
          ] : []),
        ] as DriveStep[],
      });

      // Mark as seen immediately so it never re-shows
      localStorage.setItem("izy-tour-completed", "true");
      driverObj.drive();
    }, 1500);

    return () => clearTimeout(startTour);
  }, [pathname, router]);

  return null;
}
