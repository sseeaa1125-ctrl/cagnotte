"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
    
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const headers = el.querySelectorAll(".faq-header");
      const items = el.querySelectorAll(".faq-item");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        }
      });

      tl.from(headers, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        immediateRender: false
      })
      .from(items, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        immediateRender: false
      }, "-=0.4");
      
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 sm:py-32 bg-gray-50 border-t border-gray-100">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-20 flex flex-col items-center">
          <h2 className="faq-header text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Questions fréquentes
          </h2>
          <p className="faq-header mt-4 text-sm sm:text-xl text-gray-500 font-medium">
            Tout ce que tu dois savoir avant de te lancer.
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {[
            {
              q: "Faut-il des compétences techniques pour utiliser Izy.store ?",
              a: "Absolument aucune. Notre outil est conçu pour être aussi simple que d'envoyer un message sur WhatsApp. Tu peux créer ta boutique complète depuis ton téléphone en moins de 2 minutes. Pas de code, pas de design compliqué."
            },
            {
              q: "Dois-je avoir une entreprise enregistrée ?",
              a: "Non. Que tu sois un particulier qui se lance, un créateur de contenu ou une entreprise déjà établie, tu peux commencer à vendre et encaisser tes paiements immédiatement. Nous nous occupons de toute la complexité technique et légale des paiements."
            },
            {
              q: "Quand et comment puis-je retirer mon argent ?",
              a: "Ton argent est disponible immédiatement après chaque vente. Tu peux lancer un retrait vers ton compte Wave ou Orange Money en 1 clic, depuis ton tableau de bord. Le transfert est instantané."
            },
            {
              q: "Puis-je vendre à des clients de la diaspora ?",
              a: "Oui ! En plus de Wave et Orange Money pour tes clients locaux, nous acceptons les paiements par carte bancaire (Visa, Mastercard) du monde entier. Tu ne rateras plus aucune vente internationale."
            }
          ].map((faq, i) => (
            <details key={i} className="faq-item group bg-white rounded-2xl border border-gray-100 open:shadow-md open:border-teal-100 transition-all duration-300">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 sm:p-6 font-extrabold text-gray-900 sm:text-lg">
                {faq.q}
                <span className="shrink-0 rounded-full bg-white p-2 sm:p-2.5 shadow-sm group-open:-rotate-180 group-open:bg-teal-50 group-open:text-teal-600 transition-all duration-300">
                  <ChevronDown size={20} className="sm:w-6 sm:h-6" />
                </span>
              </summary>
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
