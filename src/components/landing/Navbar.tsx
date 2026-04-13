"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // Wait 3 seconds before showing navbar to sync with LandingLoader
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 3200);

    const onScroll = () => {
      const currentY = window.scrollY;
      // Toujours visible en haut de page
      if (currentY < 80) {
        setVisible(true);
      } else {
        // On remonte → afficher, on descend → cacher
        setVisible(currentY < lastScrollY.current);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0"
      }`}
    >
      <div className="pointer-events-auto flex items-center justify-between gap-4 sm:gap-6 w-full max-w-5xl bg-white border border-gray-200/60 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 shadow-[0_2px_24px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_4px_32px_-4px_rgba(0,0,0,0.12)]">
        <Link href="/" className="flex items-center shrink-0">
          <Image 
            src="/logo/1x/Logo Izy.store.png" 
            alt="Izy.store" 
            width={120} 
            height={36} 
            className="w-[90px] sm:w-[110px] h-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-bold text-gray-500 transition-colors hover:text-gray-900"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-full bg-gray-900 px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-teal-600 active:scale-95 shadow-sm"
          >
            <span className="sm:hidden">S&apos;inscrire</span>
            <span className="hidden sm:inline">Créer mon compte</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
