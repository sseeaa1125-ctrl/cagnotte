"use client";

import { useEffect, useRef } from "react";
import { Smartphone, CreditCard } from "lucide-react";
import { AnimatedFrictionCircle, CheckoutSimulator } from "@/components/landing/LandingWidgets";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function PaymentMethodsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          // Fin de l'animation quand la section est entièrement visible
        },
      });

      // Titre et sous-titre
      tl.from(".payment-title", { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" })
        .from(".payment-subtitle", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.4");
      
      // La grande boîte
      tl.from(".payment-box", { 
        y: 60, 
        opacity: 0, 
        scale: 0.95,
        duration: 1, 
        ease: "power3.out" 
      }, "-=0.2");

      // Apparition des éléments à l'intérieur
      tl.from(".payment-item", {
        x: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
        ease: "power2.out",
      }, "-=0.4");

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-gray-50 relative border-t border-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
        
        <AnimatedFrictionCircle />
        
        <h2 className="payment-title text-2xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mt-2 sm:mt-4">
          Tes clients paient. Tu encaisses.
        </h2>
        <p className="payment-subtitle mt-4 sm:mt-6 text-sm sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
          Accepte <strong className="text-gray-900">Wave</strong>, <strong className="text-gray-900">Orange Money</strong> et la <strong className="text-gray-900">Carte Bancaire</strong> en un clic. L&apos;argent arrive directement dans ton wallet. Zéro config technique.
        </p>

        <div className="payment-box mt-10 sm:mt-20 bg-gray-50 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-16 border border-gray-100 flex flex-col lg:flex-row items-center gap-8 sm:gap-16 shadow-inner w-full overflow-hidden">
          <div className="w-full max-w-md shrink-0">
            <CheckoutSimulator />
          </div>
          <div className="flex-1 text-left space-y-6 sm:space-y-8 w-full mt-4 lg:mt-0">
            <h3 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Convertis plus de visiteurs en clients payants.</h3>
            <div className="space-y-5 sm:space-y-6">
              <div className="payment-item flex gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-300">
                  <Smartphone className="text-teal-600 w-5 h-5 sm:w-[26px] sm:h-[26px]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-lg font-bold text-gray-900">Wave & Orange Money</h4>
                  <p className="text-xs sm:text-base text-gray-600 mt-1 font-medium leading-relaxed">Paiement en 2 clics pour tes clients au Sénégal, en Côte d&apos;Ivoire et partout en Afrique de l&apos;Ouest.</p>
                </div>
              </div>
              <div className="payment-item flex gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-300">
                  <CreditCard className="text-teal-600 w-5 h-5 sm:w-[26px] sm:h-[26px]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-lg font-bold text-gray-900">Visa & Mastercard</h4>
                  <p className="text-xs sm:text-base text-gray-600 mt-1 font-medium leading-relaxed">Ne rate plus les ventes de la diaspora. Tes clients internationaux paient en toute sécurité.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
