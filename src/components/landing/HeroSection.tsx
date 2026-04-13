"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Star, Calendar, MousePointer2, Link as LinkIcon, Link2, Quote, ShoppingBag } from "lucide-react";
import { SiX, SiBehance, SiYoutube } from "react-icons/si";
import { FaLinkedin, FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa6";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const ROTATING_WORDS = ["besoin.", "envie.", "rêvé."];

const WIDGET_ITEMS = [
  { name: "PRODUITS", Icon: ShoppingBag, color: "text-purple-500" },
  { name: "X", Icon: SiX, color: "text-gray-900" },
  { name: "INSTAGRAM", Icon: FaInstagram, color: "text-[#E1306C]" },
  { name: "FACEBOOK", Icon: FaFacebook, color: "text-[#1877F2]" },
  { name: "TIKTOK", Icon: FaTiktok, color: "text-gray-900" },
  { name: "BEHANCE", Icon: SiBehance, color: "text-[#1769ff]" },
  { name: "LINKEDIN", Icon: FaLinkedin, color: "text-[#0a66c2]" },
  { name: "VOTRE SITE", Icon: Link2, color: "text-emerald-500" },
  { name: "CITATIONS", Icon: Quote, color: "text-pink-500" },
  { name: "YOUTUBE", Icon: SiYoutube, color: "text-[#ff0000]" },
];

export const HeroSection = forwardRef<HTMLElement, {}>((props, ref) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const rotatingRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [currentWord, setCurrentWord] = useState(0);

  // ── Animation d'entrée ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    const ctx = gsap.context(() => {
      const baseDelay = 3.0;

      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      const isMobile = window.innerWidth < 640;

      const heroElements = [".hero-badge", ".hero-title", ".hero-subtitle", ".hero-cta", ".hero-social", ".hero-widget"];

      gsap.set(heroElements, {
        x: -40,
        opacity: 0,
        ...(isMobile ? {} : { filter: "blur(8px)" }),
      });

      tl.to(heroElements, {
        x: 0,
        opacity: 1,
        ...(isMobile ? {} : { filter: "blur(0px)" }),
        duration: 1.2,
        stagger: 0.15,
        delay: baseDelay,
      });

      // ── Cursor humain qui vient cliquer + Tooltip ──
      if (cursorRef.current && tooltipRef.current) {
        gsap.set(cursorRef.current, { opacity: 0, x: 100, y: 100, scale: 1 });
        gsap.set(tooltipRef.current, { opacity: 0, y: 5, scale: 0.95 });
        
        const cursorTl = gsap.timeline({ repeat: -1, delay: 4, repeatDelay: 1.5 });
        
        cursorTl
          // Arrivée courbe et fluide vers le mot
          .to(cursorRef.current, {
            x: -20,
            y: 10,
            opacity: 1,
            duration: 1.2,
            ease: "power2.out"
          })
          // Hésitation humaine (ralentissement)
          .to(cursorRef.current, {
            x: -35,
            y: -5,
            duration: 0.4,
            ease: "sine.inOut"
          })
          // Apparition du Tooltip (au survol du pointeur)
          .to(tooltipRef.current, {
            opacity: 1,
            y: -10,
            scale: 1,
            duration: 0.3,
            ease: "back.out(2)"
          }, "-=0.2")
          // Clic (press)
          .to(cursorRef.current, {
            scale: 0.8,
            duration: 0.1,
            ease: "power1.inOut"
          })
          // Clic (relâche)
          .to(cursorRef.current, {
            scale: 1,
            duration: 0.2,
            ease: "back.out(2)"
          })
          // Mouvement subtil post-clic avant de repartir
          .to(cursorRef.current, {
            x: -30,
            y: 0,
            duration: 0.6,
            ease: "sine.inOut"
          })
          // Disparition du Tooltip (car le pointeur va repartir)
          .to(tooltipRef.current, {
            opacity: 0,
            y: 5,
            scale: 0.95,
            duration: 0.3,
            ease: "power2.in"
          }, "-=0.2")
          // Le curseur glisse hors cadre et disparaît
          .to(cursorRef.current, {
            x: 80,
            y: 120,
            opacity: 0,
            duration: 1,
            ease: "power2.in"
          });
      }

      // ── Phone Animation: Entrée Premium 3D + Cascade UI + Floating ──
      if (phoneRef.current) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const isLowPower = (() => {
          const cores = navigator.hardwareConcurrency || 2;
          const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4;
          return cores < 4 || memory < 4;
        })();
        const isSimple = prefersReducedMotion || isLowPower;

        gsap.set(phoneRef.current, { 
          y: isSimple ? 50 : 150, 
          opacity: 0, 
          scale: isSimple ? 1 : 0.85,
          rotationX: isSimple ? 0 : 25,
          rotationY: isSimple ? 0 : -8,
          rotationZ: isSimple ? 0 : -2,
          transformPerspective: 1200,
          transformStyle: "preserve-3d"
        });

        // Préparation des éléments internes du téléphone
        const internals = phoneRef.current.querySelectorAll('.phone-internal');
        gsap.set(internals, { y: 20, opacity: 0 });

        const phoneTl = gsap.timeline({
          scrollTrigger: {
            trigger: phoneRef.current,
            start: "top 90%",
          }
        });

        phoneTl.to(phoneRef.current, {
          y: 0,
          opacity: 1,
          scale: 1,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          duration: isSimple ? 0.8 : 1.8,
          ease: isSimple ? "power2.out" : "expo.out",
        })
        .to(internals, {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: "back.out(1.2)",
          onComplete: () => {
            if (!isSimple) {
              // Lévitation (respiration organique)
              gsap.to(phoneRef.current, {
                y: -10,
                rotationX: 1.5,
                rotationY: -1.5,
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
              });
            }
          }
        }, "-=1.1"); // Anticipation calculée : l'UI apparaît avant la fin de l'entrée du téléphone
      }

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ── Rotation des mots du titre ──
  useEffect(() => {
    const el = rotatingRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 640;
    const isLowPower = (() => {
      const cores = navigator.hardwareConcurrency || 2;
      const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4;
      return cores < 4 || memory < 4;
    })();
    const useBlur = !prefersReducedMotion && !isLowPower && !isMobile;

    let wordIndex = 0;
    gsap.set(el, { opacity: 1, y: 0, ...(useBlur && { filter: "blur(0px)" }) });

    const cycle = () => {
      gsap.to(el, {
        opacity: 0,
        y: -16,
        ...(useBlur && { filter: "blur(12px)" }),
        duration: prefersReducedMotion ? 0.3 : 0.5,
        ease: "power2.in",
        onComplete: () => {
          wordIndex = (wordIndex + 1) % ROTATING_WORDS.length;
          setCurrentWord(wordIndex);
          gsap.set(el, { y: 16, opacity: 0, ...(useBlur && { filter: "blur(12px)" }) });
          gsap.to(el, {
            opacity: 1,
            y: 0,
            ...(useBlur && { filter: "blur(0px)" }),
            duration: prefersReducedMotion ? 0.3 : 0.6,
            ease: "power3.out",
          });
        },
      });
    };

    const interval = setInterval(cycle, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={(node) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      containerRef.current = node;
    }} className="relative bg-white text-gray-900 overflow-visible w-full pt-28 sm:pt-40 pb-0 z-10">
      
      {/* ── Animated background ── */}
      {/* Dot grid subtile */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage: "radial-gradient(circle, #0d9488 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      


      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
        {/* Texte centré */}
        <div className="flex flex-col items-center text-center">
          
          {/* Badge */}
          <div className="hero-badge inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs sm:text-sm font-bold text-teal-700 mb-8 sm:mb-10">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Le Link-in-bio pour l&apos;Afrique
          </div>

          {/* Title */}
          <h1 className="hero-title text-[2.5rem] leading-[1.08] sm:text-[3.5rem] lg:text-[4.5rem] font-black tracking-tight text-gray-900">
            Le seul <Link href="/signup" className="relative inline-block cursor-pointer hover:text-teal-600 transition-colors duration-200 decoration-teal-600/30 hover:underline underline-offset-[12px]">
              lien
              {/* ── Tooltip (Popup de lien) ── */}
              <div ref={tooltipRef} className="absolute -top-12 sm:-top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none will-change-transform">
                <div className="bg-gray-900 text-white rounded-xl py-2 px-3 sm:px-4 shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-bold whitespace-nowrap border border-gray-700">
                  <LinkIcon size={14} className="text-teal-400" />
                  izy.store/you
                </div>
                {/* Petit triangle */}
                <div className="w-3 h-3 bg-gray-900 mx-auto -mt-1.5 rotate-45 border-r border-b border-gray-700"></div>
              </div>

              {/* ── Curseur flottant type humain ── */}
              <div ref={cursorRef} className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 z-50 pointer-events-none will-change-transform">
                <div className="relative">
                  <MousePointer2 className="w-8 h-8 sm:w-10 sm:h-10 text-teal-500 fill-teal-500 -rotate-12 drop-shadow-md" strokeWidth={1} />
                </div>
              </div>
            </Link> dont{" "}
            <br className="hidden sm:block" />
            vous avez{" "}
            <span className="relative inline-block align-bottom">
              {ROTATING_WORDS.map((word) => (
                <span key={word} className="invisible block h-0 first:h-auto" aria-hidden="true">
                  {word}
                </span>
              ))}
              <span
                ref={rotatingRef}
                className="absolute left-0 top-0 inline-block bg-linear-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent will-change-transform"
              >
                {ROTATING_WORDS[currentWord]}
              </span>
              <svg className="absolute w-full h-3 -bottom-0.5 left-0 text-amber-400 animate-draw" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path d="M2 7C50 2 150 2 198 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
            Créez votre page, vendez vos produits et encaissez par <strong className="text-gray-900">Wave, Orange Money et Carte</strong> — en 2 minutes.
          </p>

          {/* CTA Input */}
          <div className="hero-cta w-full max-w-md mt-10 sm:mt-12">
            <div className="flex items-center w-full bg-white border-2 border-gray-200 rounded-2xl sm:rounded-full p-1.5 transition-all duration-300 focus-within:border-teal-500 focus-within:shadow-[0_0_0_6px_rgba(13,148,136,0.08)] group">
              <div className="flex items-center flex-1 min-w-0 px-3 sm:px-4">
                <span className="text-gray-400 font-medium whitespace-nowrap text-[15px] sm:text-base transition-colors group-focus-within:text-teal-600">
                  izy.store/
                </span>
                <input 
                  type="text" 
                  placeholder="votre-nom"
                  className="w-full py-3 bg-transparent outline-none text-gray-900 font-bold text-[15px] sm:text-base placeholder:text-gray-300 placeholder:font-medium min-w-0"
                />
              </div>
              <Link
                href="/signup" 
                className="shrink-0 bg-gray-900 hover:bg-teal-600 text-white px-5 sm:px-6 py-3 rounded-xl sm:rounded-full font-bold text-sm transition-all duration-300 active:scale-95 whitespace-nowrap flex items-center gap-1.5"
              >
                C&apos;est parti
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            
            <p className="mt-4 text-sm font-medium text-gray-400 flex items-center gap-2 justify-center">
              <Check size={14} className="text-teal-500" strokeWidth={3} />
              Gratuit. Sans carte bancaire.
            </p>
          </div>

          {/* Social proof */}
          <div className="hero-social mt-10 sm:mt-12 flex items-center gap-3 justify-center">
            <div className="flex -space-x-2.5">
              {[
                { name: "Amadou", src: "/testimonial/testimonial_pic_8.avif" },
                { name: "Mohamed", src: "/testimonial/testimonial_pic_4_mohamed.jpeg" },
                { name: "Fatou", src: "/testimonial/testimonial_pic_3.avif" },
                { name: "Khalil T.", src: "/testimonial/khalil.jpeg" }
              ].map((user) => (
                <Image 
                  key={user.name}
                  src={user.src} 
                  alt={user.name} width={36} height={36} 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white bg-gray-100 object-cover" 
                  unoptimized 
                />
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">+500 créateurs actifs</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Social Widget Infinite Carousel ── */}
      <div className="hero-widget relative mt-8  w-full overflow-hidden flex flex-col items-center z-10">
        <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-8 sm:mb-10">Notre Widget</p>
        
        {/* Double container for perfect seamless marquee loop */}
        <div className="relative flex w-full max-w-[100vw] overflow-hidden group">
          {/* Masques pour fondre les bords (rend super clean) */}
          <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-linear-to-l from-white to-transparent z-10 pointer-events-none"></div>
          
          {/* We repeat the items 4 times total to ensure enough width for seamless -50% translation */}
          <div className="flex whitespace-nowrap animate-marquee group-hover:paused w-max">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-12 sm:gap-16 items-center px-6 sm:px-8">
                {WIDGET_ITEMS.map((item, j) => (
                  <div key={`${i}-${j}`} className="flex items-center gap-2.5 grayscale-[0.1] hover:grayscale-0 transition-all duration-300 cursor-pointer">
                    <item.Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${item.color}`} />
                    <span className="text-xs sm:text-[13px] font-bold text-gray-500 tracking-wider">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Phone Mockup — Parallax au scroll, espace généreux en bas ── */}
      <div className="relative mt-8 sm:mt-12 flex justify-center pb-16 sm:pb-24 lg:pb-32 z-20">
        <div ref={phoneRef} className="relative w-[240px] sm:w-[260px] lg:w-[280px] mx-auto will-change-transform">
          
          {/* Side Buttons (Hardware buttons out of the frame) */}
          <div className="absolute top-[100px] -left-[2px] w-[3px] h-[26px] bg-zinc-700/80 rounded-l-md border-y border-zinc-600 shadow-sm z-0"></div>
          <div className="absolute top-[140px] -left-[2px] w-[3px] h-[50px] bg-zinc-700/80 rounded-l-md border-y border-zinc-600 shadow-sm z-0"></div>
          <div className="absolute top-[205px] -left-[2px] w-[3px] h-[50px] bg-zinc-700/80 rounded-l-md border-y border-zinc-600 shadow-sm z-0"></div>
          <div className="absolute top-[160px] -right-[2px] w-[3px] h-[70px] bg-zinc-700/80 rounded-r-md border-y border-zinc-600 shadow-sm z-0"></div>

          {/* Metal Frame (Outer Edge) */}
          <div className="relative z-10 bg-zinc-800 rounded-[3.2rem] sm:rounded-[3.5rem] p-[3px] shadow-[0_0_0_1px_#52525b,inset_0_0_6px_rgba(0,0,0,0.8),0_25px_50px_-12px_rgba(0,0,0,0.5)]">
            
            {/* The Black Bezel */}
            <div className="bg-black rounded-[3rem] sm:rounded-[3.3rem] p-[8px] sm:p-[10px] relative">
              
              {/* Screen Content */}
              <div className="bg-white rounded-[2.5rem] sm:rounded-[2.7rem] overflow-hidden relative aspect-[393/852] flex flex-col">
                
                {/* Dynamic Island */}
                <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 w-[90px] sm:w-[110px] h-[28px] sm:h-[32px] bg-black rounded-full z-30 flex items-center justify-end px-2 sm:px-3 shadow-md">
                  {/* Camera lens reflection effect */}
                  <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#0a0a0a] border border-zinc-900 shadow-inner relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500/30 rounded-full blur-[0.5px]"></div>
                  </div>
                </div>
              
              <div className="pt-12 pb-6 sm:pb-8 px-4 bg-gray-50 flex-1 w-full flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div>
                  {/* Profile */}
                  <div className="phone-internal will-change-transform flex flex-col items-center mb-5">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-tr from-teal-400 to-teal-600 p-0.5 mb-2">
                      <Image src="/testimonial/testimonial_pic_3.avif" alt="Profile" width={64} height={64} className="w-full h-full object-cover rounded-full border border-white bg-white" unoptimized />
                  </div>
                  <h4 className="font-black text-gray-900 text-base">Fatou Design</h4>
                  <p className="text-xs text-gray-500 font-medium">UX/UI Designer</p>
                </div>
                
                <div className="space-y-2.5">
                  {/* Link block */}
                  <button className="phone-internal will-change-transform w-full py-3 px-4 bg-white rounded-xl shadow-sm border border-gray-100 text-center text-[13px] font-bold text-gray-800">
                    Mon Portfolio Behance
                  </button>
                  
                  {/* Sale block */}
                  <div className="phone-internal will-change-transform w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <div className="h-24 bg-linear-to-br from-teal-600 to-teal-500 w-full relative flex items-center justify-center">
                      <span className="text-white font-black text-sm">Pack Templates UI</span>
                      <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-black text-gray-900">
                        15 000 F
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] text-gray-500 font-medium mb-2">50 templates Figma prêts à l&apos;emploi.</p>
                      <button className="w-full py-2 bg-gray-900 text-white rounded-lg text-xs font-bold">
                        Acheter via Wave
                      </button>
                    </div>
                  </div>

                  {/* Booking block */}
                  <div className="phone-internal will-change-transform w-full bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                        <Calendar size={14} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-[13px] font-bold text-gray-900">Coaching UX/UI</p>
                        <p className="text-[11px] text-gray-400">1h • Google Meet</p>
                      </div>
                    </div>
                  </div>
                </div>
                </div> {/* Closing tag for the main internal content wrapper */}

                <div className="mt-6 text-center pb-2">
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Créé avec Izy.store</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
});
HeroSection.displayName = "HeroSection";
