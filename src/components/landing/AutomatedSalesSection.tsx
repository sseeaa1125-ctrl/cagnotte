"use client";

import { useEffect, useRef } from "react";
import { DeliveryTimeline, BookingGrid, TelegramWidget } from "@/components/landing/LandingWidgets";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STEPS = [
  {
    step: "01",
    badge: "Revenus passifs",
    badgeColor: "bg-teal-50 text-teal-700",
    title: <>Vends tes produits digitaux en <br className="hidden sm:block" /> pilote automatique.</>,
    desc: "Ajoute ton E-book, fixe ton prix, on génère ta page. Dès qu'un client paie, il reçoit son fichier instantanément, même à 3h du matin pendant que tu dors.",
    Widget: DeliveryTimeline,
    reverse: true,
  },
  {
    step: "02",
    badge: "Ton temps est précieux",
    badgeColor: "bg-teal-50 text-teal-700",
    title: <>Finis les allers-retours <br className="hidden sm:block" /> interminables.</>,
    desc: "Arrête de discuter sur WhatsApp pour trouver une heure de RDV. Partage ton lien, tes clients voient tes dispos, choisissent leur créneau et paient à l'avance.",
    Widget: BookingGrid,
    reverse: false,
  },
  {
    step: "03",
    badge: "Revenus récurrents",
    badgeColor: "bg-teal-50 text-teal-700",
    title: <>Gère ton canal Telegram VIP. <br className="hidden sm:block" /> Sans lever le petit doigt.</>,
    desc: "Fini d'ajouter ou de retirer les membres à la main. Dès qu'un client paie son abonnement, il reçoit son lien d'accès unique. S'il ne paie plus, notre bot le retire automatiquement.",
    Widget: TelegramWidget,
    reverse: true,
  },
];

export default function AutomatedSalesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const blocks = el.querySelectorAll(".feature-block");
      
      blocks.forEach((sec) => {
        const textSide = sec.querySelector(".feature-text");
        const widgetSide = sec.querySelector(".feature-widget");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: sec, start: "top 80%", once: true },
        });

        if (textSide) {
          tl.from(textSide, { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" });
        }
        if (widgetSide) {
          tl.from(widgetSide, { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.5");
        }
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 sm:py-32 bg-gray-50 border-t border-gray-100 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {STEPS.map((s, i) => (
          <div key={s.step} className={`feature-block relative grid lg:grid-cols-2 gap-8 sm:gap-16 items-center ${i < STEPS.length - 1 ? "mb-16 sm:mb-32" : ""}`}>

            {/* Ligne de connexion entre les étapes */}
            {i < STEPS.length - 1 && (
              <div className="hidden lg:block absolute left-1/2 -bottom-16 sm:-bottom-32 w-px h-16 sm:h-32 bg-linear-to-b from-gray-200 to-transparent"></div>
            )}

            {/* Widget */}
            <div className={`feature-widget ${s.reverse ? "order-2 lg:order-1" : "order-2"} h-[320px] sm:h-[450px] ${!s.reverse ? "flex items-center justify-center" : ""} relative z-10`}>
              {/* Tag numéro d'étape */}
              <div className="step-number absolute -top-3 -left-3 z-20 bg-white border border-gray-200 shadow-sm rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block"></span>
                <span className="text-xs font-black text-gray-400 tracking-widest">{s.step}</span>
              </div>
              <s.Widget />
            </div>

            {/* Texte */}
            <div className={`feature-text ${s.reverse ? "order-1 lg:order-2" : "order-1"} space-y-4 sm:space-y-8 text-center lg:text-left relative z-10`}>
              <div className={`inline-block ${s.badgeColor} font-extrabold px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full text-[10px] sm:text-sm tracking-wide uppercase`}>
                {s.badge}
              </div>
              <h2 className="text-2xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                {s.title}
              </h2>
              <p className="text-sm sm:text-xl text-gray-500 leading-relaxed font-medium">
                {s.desc}
              </p>
            </div>
          </div>
        ))}

      </div>
    </section>
  );
}
