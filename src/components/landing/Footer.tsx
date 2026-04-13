"use client";

import { forwardRef, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const Footer = forwardRef<HTMLElement, {}>((props, ref) => {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
    
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
        }
      });

      tl.from(".footer-header", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out"
      })
      .from(".footer-cta", {
        scale: 0.9,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.5)"
      }, "-=0.4")
      .from(".footer-bottom", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.2");

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={(node) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      containerRef.current = node;
    }} className="relative bg-teal-600 pt-20 pb-10 sm:pt-32 sm:pb-12 px-4 sm:px-6 text-white text-center overflow-hidden">
      <div className="absolute inset-0 bg-wax opacity-10 mix-blend-overlay"></div>
      
      <div className="mx-auto max-w-4xl mb-20 sm:mb-32 relative z-10 flex flex-col items-center">
        <h2 className="footer-header text-2xl font-extrabold tracking-tight sm:text-6xl mb-3 sm:mb-6 leading-[1.1]">
          Prêt(e) à vendre ?
        </h2>
        <p className="footer-header text-sm sm:text-xl text-teal-100 font-medium max-w-xl mx-auto mb-6 sm:mb-8">
          Crée ta page en 2 minutes. C&apos;est gratuit, sans engagement, et on ne gagne que si tu gagnes.
        </p>
        <div className="footer-cta w-full max-w-md">
          <div className="flex items-center w-full bg-white border border-teal-400/30 rounded-2xl sm:rounded-full p-1.5 transition-all duration-300 focus-within:shadow-[0_0_0_6px_rgba(255,255,255,0.2)] group">
            <div className="flex items-center flex-1 min-w-0 px-3 sm:px-4">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[15px] sm:text-base transition-colors group-focus-within:text-teal-600">
                izy.store/
              </span>
              <input 
                type="text" 
                placeholder="votre-nom"
                className="w-full py-3 bg-transparent outline-none text-gray-900 font-bold text-[15px] sm:text-base placeholder:text-gray-300 min-w-0"
              />
            </div>
            <Link
              href="/signup" 
              className="shrink-0 bg-gray-900 hover:bg-teal-600 text-white px-5 sm:px-6 py-3 rounded-xl sm:rounded-full font-bold text-sm transition-all duration-300 active:scale-95 whitespace-nowrap flex items-center gap-1.5 shadow-lg shadow-teal-900/10"
            >
              C&apos;est parti
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-4 text-sm font-medium text-teal-100 flex items-center gap-2 justify-center">
            <Check size={14} className="text-teal-300" strokeWidth={3} />
            Gratuit. Sans carte bancaire.
          </p>
        </div>
      </div>

      <div className="footer-bottom mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 border-t border-teal-500/50 pt-10 sm:pt-12 relative z-10">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-8">
          <div className="flex items-center gap-2 shrink-0">
            <Image 
              src="/logo/1x/Logo Izy.store ic%C3%B4ne jaune.png" 
              alt="Izy.store" 
              width={100} 
              height={100} 
              className="h-auto object-contain drop-shadow-sm"
            />
          </div>
          <span className="hidden sm:block w-2 h-2 rounded-full bg-teal-400"></span>
          <span className="text-xs sm:text-base text-teal-100 font-medium"> 2026 Tous droits réservés.</span>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-teal-100">
          <Link href="/cgv" className="hover:text-white transition-colors">CGV</Link>
          <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
          <Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
          <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions Légales</Link>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-3 rounded-full bg-black/10 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-base font-bold text-teal-50 border border-white/10 shadow-inner">
          <span className="relative flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 bg-emerald-400"></span>
          </span>
          Système opérationnel
        </div>
      </div>
    </section>
  );
});
Footer.displayName = "Footer";
