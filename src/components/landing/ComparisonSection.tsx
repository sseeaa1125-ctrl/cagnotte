"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import dynamic from "next/dynamic";
import flameAnimation from "../../../public/lotties/Flame animation.json";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const ROWS = [
  { tool: "Linktree Pro", cost: "10 000 F", feature: "Page Link-in-bio" },
  { tool: "Calendly Pro", cost: "9 000 F", feature: "Prise de RDV" },
  { tool: "Gumroad", cost: "Frais cachés", feature: "Produits digitaux" },
  { tool: "Mailchimp", cost: "8 000 F", feature: "Emails auto" },
];

export default function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const headers = el.querySelectorAll(".comp-header");
      const table = el.querySelector(".comp-table-container");
      const rows = el.querySelectorAll(".comp-row");
      const total = el.querySelector(".comp-total");
      const btn = el.querySelector(".comp-btn");

      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
      });

      tl.from(headers, { y: 30, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power3.out" });

      if (table) {
        tl.from(table, { y: 50, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.4");
      }

      tl.from(rows, { x: -20, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.4");

      if (total) {
        tl.from(total, { scale: 0.95, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, "-=0.2");
      }

      if (btn) {
        tl.from(btn, { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.2");
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 sm:py-32 bg-white border-t border-gray-100">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 w-full">
        <div className="text-center mb-10 sm:mb-16 flex flex-col items-center">
          <div className="comp-header inline-flex items-center justify-center rounded-full text-red-500 mb-4 sm:mb-6">
            <Lottie animationData={flameAnimation} loop={true} className="w-16 sm:w-32" />
          </div>
          <h2 className="comp-header text-2xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Arrête de brûler ton argent.
          </h2>
          <p className="comp-header mt-4 sm:mt-6 text-sm sm:text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            Pourquoi jongler entre 4 abonnements complexes quand un seul outil fait tout gratuitement ?
          </p>
        </div>

        <div className="comp-table-container bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden w-full">
          {/* Header */}
          <div className="grid grid-cols-3 items-center">
            <div className="p-3 sm:p-6 bg-gray-900 text-white font-extrabold text-[10px] sm:text-lg">Outils</div>
            <div className="p-3 sm:p-6 bg-gray-900 text-gray-400 font-extrabold text-[10px] sm:text-lg text-center">Coût/mois</div>
            <div className="p-3 sm:p-6 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-extrabold text-[10px] sm:text-lg text-center relative">
              <span className="relative z-10">Avec Izy.store</span>
              {/* Badge GRATUIT */}
              <div className="absolute -top-1 right-2 sm:right-4 bg-amber-400 text-gray-900 text-[7px] sm:text-[10px] font-black px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full shadow-lg animate-bounce">
                GRATUIT
              </div>
            </div>
          </div>
          
          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {ROWS.map((row, i) => (
              <div key={i} className="comp-row grid grid-cols-3 items-center">
                <div className="p-3 sm:p-6 font-bold text-gray-500 flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-base">
                  <div className="bg-red-50 text-red-500 p-1 sm:p-1.5 rounded-md sm:rounded-lg shrink-0">
                    <X size={12} strokeWidth={3} className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                  <span className="truncate">{row.tool}</span>
                </div>
                <div className="p-3 sm:p-6 text-center text-gray-400 font-mono line-through decoration-red-300 font-medium whitespace-nowrap text-[10px] sm:text-base">
                  {row.cost}
                </div>
                <div className="p-3 sm:p-6 text-center bg-teal-50/40">
                  <span className="font-extrabold text-teal-600 flex items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-base">
                    <div className="bg-teal-100 p-0.5 sm:p-1 rounded-md hidden sm:block">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    Inclus
                  </span>
                </div>
              </div>
            ))}
            
            {/* Total row */}
            <div className="comp-total grid grid-cols-3 items-center border-t-2 border-teal-200">
              <div className="p-3 sm:p-8 font-extrabold text-gray-900 text-[11px] sm:text-lg">Total gaspillé</div>
              <div className="p-3 sm:p-8 text-center font-bold text-gray-500 line-through decoration-red-400 text-[9px] sm:text-base whitespace-nowrap">27 000+ F / mois</div>
              <div className="p-3 sm:p-8 text-center bg-teal-50">
                <span className="font-black text-teal-600 text-lg sm:text-3xl">0 FCFA</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="comp-btn mt-10 sm:mt-16 text-center">
          <Link
            href="/signup"
            className="relative inline-flex items-center justify-center gap-2 rounded-full w-full sm:w-auto bg-teal-600 px-8 py-4 sm:px-10 sm:py-5 text-[13px] sm:text-lg font-bold text-white shadow-xl transition-all hover:bg-teal-500 active:scale-95 overflow-hidden group whitespace-nowrap"
          >
            <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine group-hover:via-white/50"></div>
            <span className="relative z-10">Remplacer mes outils gratuitement</span>
            <ArrowRight size={18} className="relative z-10" />
          </Link>
        </div>
      </div>
    </section>
  );
}
