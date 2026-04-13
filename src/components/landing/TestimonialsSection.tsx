"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const TESTIMONIALS = [
  { name: "Amadou", role: "Coach Fitness", quote: "J'ai vendu mon programme à 1.2M en 3 mois, sans site web.", rev: "1.2M FCFA/mois", image: "/testimonial/testimonial_pic_8.avif" },
  { name: "Mohamed", role: "Expert Digital", quote: "Mes ventes tournent même quand je dors. Izy a tout changé.", rev: "Ventes 100% auto", image: "/testimonial/testimonial_pic_4_mohamed.jpeg" },
  { name: "Fatou", role: "Créatrice UGC", quote: "300 e-books vendus en un mois. Livraison auto, c'est magique.", rev: "300+ E-books", image: "/testimonial/testimonial_pic_3.avif" },
  { name: "Khalil T.", role: "Consultant", quote: "Plus besoin de WhatsApp pour les RDV. Mon agenda est plein.", rev: "Agenda plein", image: "/testimonial/khalil.jpeg" },
  { name: "Aissatou", role: "Coach beauté", quote: "Wave + Orange Money en un clic. Mes clientes adorent.", rev: "500K FCFA/mois", seed: "Aissatou", color: "ec4899" },
  { name: "Moussa", role: "Formateur Dev", quote: "Mon canal Telegram VIP tourne tout seul. 200 élèves payants.", rev: "200+ élèves", seed: "Moussa", color: "f97316" },
];

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const headers = el.querySelectorAll(".testimonials-header");
      gsap.from(headers, {
        y: 20, opacity: 0, duration: 0.8, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });

      // Compteur animé
      if (countRef.current) {
        gsap.fromTo(
          countRef.current,
          { textContent: "0" },
          {
            textContent: "12847",
            duration: 2,
            ease: "power2.out",
            snap: { textContent: 1 },
            scrollTrigger: { trigger: el, start: "top 80%", once: true },
            onUpdate: function () {
              if (countRef.current) {
                const val = Math.round(parseFloat(countRef.current.textContent || "0"));
                countRef.current.textContent = val.toLocaleString("fr-FR");
              }
            },
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-12 sm:py-20 bg-white border-t border-gray-100 overflow-hidden relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Stats + header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="testimonials-header flex items-center justify-center gap-6 sm:gap-10 mb-6">
            <div className="text-center">
              <p className="text-2xl sm:text-4xl font-black text-gray-900">500<span className="text-teal-500">+</span></p>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wide">Créateurs</p>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-4xl font-black text-gray-900">
                <span ref={countRef}>0</span><span className="text-teal-500">+</span>
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wide">Ventes</p>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-4xl font-black text-gray-900">4.9<span className="text-amber-400">/5</span></p>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wide">Avis</p>
            </div>
          </div>
          <p className="testimonials-header text-sm sm:text-base font-bold text-gray-400 uppercase tracking-widest">
            Ils vendent pendant qu&apos;ils dorment
          </p>
        </div>
      </div>
      
      {/* Marquee avec vrais témoignages */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        
        <div className="flex animate-marquee w-max">
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex gap-4 sm:gap-5 px-2 sm:px-2.5">
              {TESTIMONIALS.map((c, i) => (
                <div key={`${setIdx}-${i}`} className="w-[280px] sm:w-[320px] shrink-0 bg-gray-50 rounded-2xl px-5 py-5 sm:px-6 sm:py-6 border border-gray-100 hover:bg-white hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-default">
                  {/* Citation */}
                  <p className="text-sm sm:text-[15px] text-gray-700 font-medium leading-relaxed mb-4">
                    &ldquo;{c.quote}&rdquo;
                  </p>
                  {/* Auteur */}
                  <div className="flex items-center gap-3">
                    <Image 
                      src={c.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.seed}&backgroundColor=${c.color}`} 
                      alt={c.name} width={40} height={40} 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white shadow-sm object-cover" 
                      unoptimized 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{c.name}</p>
                      <p className="text-[11px] text-gray-500 font-medium">{c.role}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} size={10} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  {/* Badge résultat */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] sm:text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                      {c.rev}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
