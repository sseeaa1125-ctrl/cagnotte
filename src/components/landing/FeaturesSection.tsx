"use client";

import { useEffect, useRef } from "react";
import { ShoppingBag, Calendar, MessageCircle, Download } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import linkChainAnimation from "../../../public/lotties/link-chain.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const headers = el.querySelectorAll(".features-header");
      const cards = el.querySelectorAll(".bento-card");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          once: true,
        }
      });

      tl.from(headers, {
        y: 30, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false
      })
      .from(cards, {
        y: 40, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power3.out", immediateRender: false
      }, "-=0.4");
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pt-18 sm:pt-24 lg:pt-28 pb-16 sm:pb-24 bg-gray-50 border-t border-gray-100 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="features-header text-center mb-12 sm:mb-16">

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
            Construisez votre page en{" "}
            <span className="text-teal-600 relative inline-block">
              ~1 minute.
              <div className="absolute -inset-x-1 -inset-y-0.5 bg-teal-50 rounded-lg -z-10 rotate-1"></div>
            </span>
          </h2>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-gray-500 max-w-xl mx-auto font-medium">
            5 types de blocs. Glissez, personnalisez, publiez.
          </p>
        </div>

        {/* ── Bento Grid ── */}
        <div className="bento-grid grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {/* ── Card 1: Vente — Grande, span 2 colonnes sur desktop ── */}
          <div className="bento-card group col-span-2 lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 cursor-default overflow-hidden relative">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex-1 min-w-0">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <ShoppingBag size={22} strokeWidth={2} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">Vente de produits</h3>
                <p className="text-sm sm:text-base text-gray-500 font-medium leading-relaxed max-w-sm">
                  Digitaux ou physiques. Livraison automatique des fichiers dès le paiement.
                </p>
              </div>
              {/* Mini-preview : fausse card produit */}
              <div className="shrink-0 w-full sm:w-[200px] bg-gray-50 rounded-2xl border border-gray-100 p-3 transition-transform duration-500 group-hover:scale-[1.03] group-hover:-rotate-1">
                <div className="h-20 sm:h-24 bg-gradient-to-br from-teal-500 to-teal-400 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                  <span className="text-white font-black text-xs sm:text-sm">Pack UI Kit</span>
                  <div className="absolute top-1.5 right-1.5 bg-white/90 px-2 py-0.5 rounded-full text-[9px] font-black text-gray-900">15 000 F</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">PDF • 12 Mo</span>
                  <div className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Auto-livré ✓</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 2: RDV ── */}
          <div className="bento-card group col-span-1 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 cursor-default overflow-hidden">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Calendar size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">Prise de RDV</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-5">Google Meet intégré, paiement à l&apos;avance.</p>
            
            {/* Mini calendrier */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 transition-transform duration-500 group-hover:scale-[1.03]">
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((d) => (
                  <span key={d} className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase">{d}</span>
                ))}
                {[14, 15, 16, 17, 18].map((n) => (
                  <div
                    key={n}
                    className={`text-[10px] sm:text-xs font-bold py-1.5 rounded-lg transition-colors ${
                      n === 16
                        ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                        : n === 17
                        ? "bg-amber-50 text-amber-600"
                        : "text-gray-400"
                    }`}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Card 3: Telegram ── */}
          <div className="bento-card group col-span-1 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 cursor-default overflow-hidden">
            <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <MessageCircle size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">Canal Telegram</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-5">Abonnements payants, ajout et retrait automatique.</p>
            
            {/* Mini preview membres */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2 transition-transform duration-500 group-hover:scale-[1.03]">
              {[
                { name: "Amadou K.", status: "Actif", color: "bg-teal-400" },
                { name: "Seydou D.", status: "Nouveau", color: "bg-amber-400" },
              ].map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.color}`} />
                  <span className="text-[10px] sm:text-xs font-bold text-gray-700 flex-1">{m.name}</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">{m.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Card 4: Liens ── */}
          <div className="bento-card group col-span-1 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 cursor-default overflow-hidden flex flex-col">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 overflow-hidden relative shrink-0">
              <Lottie animationData={linkChainAnimation} loop={true} className="w-16 h-16 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.2]" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">Liens illimités</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-5">Réseaux, portfolio, site web. Tout au même endroit.</p>
            
            {/* Mini preview liens */}
            <div className="mt-auto bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2 transition-transform duration-500 group-hover:scale-[1.03]">
              <div className="h-7 bg-white rounded-lg border border-gray-100 flex items-center px-3 justify-between group-hover:-translate-y-0.5 transition-transform duration-300 delay-75 shadow-sm">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                   <span className="text-[10px] font-bold text-gray-700">Mon Site Web</span>
                 </div>
              </div>
              <div className="h-7 bg-white rounded-lg border border-gray-100 flex items-center px-3 justify-between group-hover:-translate-y-0.5 transition-transform duration-300 delay-150 shadow-sm">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-amber-100 rounded-full"></div>
                   <span className="text-[10px] font-bold text-gray-700">Portfolio</span>
                 </div>
              </div>
              <div className="h-7 bg-white rounded-lg border border-gray-100 flex items-center px-3 justify-between group-hover:-translate-y-0.5 transition-transform duration-300 delay-200 shadow-sm">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-rose-100 rounded-full"></div>
                   <span className="text-[10px] font-bold text-gray-700">Instagram</span>
                 </div>
              </div>
            </div>
          </div>

          {/* ── Card 5: Fichiers ── */}
          <div className="bento-card group col-span-1 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 cursor-default overflow-hidden flex flex-col">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0">
              <Download size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">Fichiers & Guides</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-5">Vendez ou partagez e-books, templates, etc.</p>
            
            {/* Mini preview fichiers */}
            <div className="mt-auto bg-gray-50 rounded-xl border border-gray-100 p-3 grid grid-cols-2 gap-2 transition-transform duration-500 group-hover:scale-[1.03]">
              {/* File 1 */}
              <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm relative group-hover:-translate-y-1 transition-transform duration-300 delay-75 hover:border-rose-200 flex flex-col items-center justify-center aspect-square">
                <div className="w-full max-w-[28px] aspect-3/4 bg-rose-50 border border-rose-100 rounded-[4px] relative mb-2 mx-auto flex items-center justify-center">
                   <div className="absolute top-0 right-0 w-2 h-2 bg-rose-200 rounded-bl-[4px] rounded-tr-[4px]"></div>
                   <span className="text-[6px] font-black text-rose-600 mt-1">PDF</span>
                </div>
                <div className="w-full h-1 bg-gray-100 rounded-full mt-auto mb-1"></div>
                <div className="w-2/3 h-1 bg-gray-100 rounded-full"></div>
              </div>
              {/* File 2 */}
              <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm relative group-hover:-translate-y-1 transition-transform duration-300 delay-150 hover:border-purple-200 flex flex-col items-center justify-center aspect-square">
                <div className="w-full max-w-[28px] aspect-4/3 bg-purple-50 border border-purple-100 rounded-[4px] relative mb-2 mx-auto flex flex-col items-center justify-center overflow-hidden">
                   <div className="w-full h-2 bg-purple-200 absolute top-0"></div>
                   <span className="text-[6px] font-black text-purple-600 mt-2">ZIP</span>
                </div>
                <div className="w-full h-1 bg-gray-100 rounded-full mt-auto mb-1"></div>
                <div className="w-1/2 h-1 bg-gray-100 rounded-full"></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
