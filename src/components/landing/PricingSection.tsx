"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FEATURES = [
  "Page de vente illimitée",
  "Wave, Orange Money & Carte",
  "Livraison automatique de fichiers",
  "Prise de RDV intégrée",
  "Communautés Telegram payantes",
  "Statistiques en temps réel",
  "Retraits Mobile Money illimités",
  "Support WhatsApp inclus",
];

export default function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) return;
    
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      });

      tl.from([".pricing-eyebrow", ".pricing-headline"], {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
      })
      .from(".pricing-card", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
      }, "-=0.4")
      .from(".pricing-feature", {
        x: -12,
        opacity: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out",
      }, "-=0.6");
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 sm:py-32 bg-white border-t border-gray-100 overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <div className="pricing-eyebrow inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700 uppercase tracking-widest mb-5">
            <Zap size={11} className="text-teal-500" />
            Tarification
          </div>
          <h2 className="pricing-headline text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            On gagne quand tu gagnes.
          </h2>
        </div>

        {/* Card */}
        <div className="pricing-card relative rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-100">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-teal-500 via-teal-400 to-teal-600" />

          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

            {/* Left — Prix */}
            <div className="p-8 sm:p-12 bg-gray-50 flex flex-col">
              <div className="inline-flex self-start items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-600 mb-8">
                Un seul plan. Tout inclus.
              </div>

              <div className="mb-3">
                <span className="text-7xl sm:text-8xl font-black text-gray-900 tracking-tighter">0</span>
                <span className="text-xl sm:text-2xl font-bold text-gray-400 ml-2">FCFA / mois</span>
              </div>
              <p className="text-gray-500 text-sm sm:text-base font-medium leading-relaxed">
                Pas d&apos;abonnement. Pas de frais cachés.<br />
                On prend <span className="text-amber-500 font-bold">8%</span> uniquement quand tu fais une vente.
              </p>

              {/* Calculator */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 self-start">
                <span className="text-xs text-gray-400 font-medium">10 000 F</span>
                <span className="text-gray-300 text-xs">→</span>
                <span className="text-xs font-bold text-teal-600">9 200 F</span>
                <span className="text-[10px] text-gray-400 font-medium">(8% commission)</span>
              </div>

              <Link
                href="/signup"
                className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 hover:bg-teal-600 active:scale-[0.98] text-white px-6 py-4 font-bold text-sm transition-all duration-200 group"
              >
                Commencer gratuitement
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Right — Features */}
            <div className="p-8 sm:p-12 bg-white">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-8">Tout est inclus</p>
              <ul className="space-y-5">
                {FEATURES.map((feat) => (
                  <li key={feat} className="pricing-feature flex items-center gap-3.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 border border-teal-100">
                      <Check size={11} strokeWidth={3} className="text-teal-600" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
