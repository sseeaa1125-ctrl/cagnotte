"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  CheckCircle, Check,
  CreditCard,
  Download,
  MessageCircle,
} from "lucide-react";
import { Spinner } from "@/components/ui";

// ── HERO TEXT ANIMATION ──
const HERO_ROLES = ["créateurs", "formateurs", "coachs", "entrepreneurs"];

export function AnimatedHeroText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % HERO_ROLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-flex flex-col items-center justify-center text-amber-300 mt-0 sm:mt-2">
      <span className="relative inline-block h-[1.2em] overflow-hidden w-full text-center">
        {HERO_ROLES.map((role, i) => (
          <span
            key={role}
            className={`absolute left-0 right-0 top-0 mx-auto w-full transition-all duration-500 ease-in-out whitespace-nowrap ${
              i === index ? "translate-y-0 opacity-100" : 
              i < index || (index === 0 && i === HERO_ROLES.length - 1) ? "-translate-y-full opacity-0" : "translate-y-full opacity-0"
            }`}
          >
            {role}
          </span>
        ))}
        {/* Invisible element to give the container the right width based on the longest word */}
        <span className="invisible whitespace-nowrap pointer-events-none">
          entrepreneurs
        </span>
      </span>
      {/* Curved Underline SVG */}
      <svg className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-[110%] h-3 sm:h-5 text-amber-400 z-[-1] pointer-events-none" viewBox="0 0 200 20" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path className="animate-draw" d="M5 15 Q 100 2 195 15" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// ── CHECKOUT SIMULATOR ──
export function CheckoutSimulator() {
  const [state, setState] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [operator, setOperator] = useState("wave");

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (state === "pending") {
      timeout = setTimeout(() => setState("success"), 2000);
    } else if (state === "success") {
      timeout = setTimeout(() => setState("idle"), 2500);
    }
    return () => clearTimeout(timeout);
  }, [state]);

  return (
    <div className="flex h-full flex-col justify-between rounded-[2rem] bg-white p-5 sm:p-8 shadow-xl border border-gray-100 w-full relative z-10">
      <div>
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Download size={20} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-gray-900 leading-tight">Formation Complète</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Par Awa Ndiaye</p>
            </div>
          </div>
        </div>
        <p className="mb-6 sm:mb-8 text-3xl sm:text-4xl font-extrabold text-gray-900">15 000 FCFA</p>

        <div className="mb-5 sm:mb-6 space-y-3">
          <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Moyen de paiement</p>
          <div className="flex gap-2">
            {["wave", "orange", "carte"].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setOperator(op)}
                className={`flex-1 rounded-xl border-2 py-2 sm:py-3 text-[10px] sm:text-xs font-bold capitalize transition-all ${
                  operator === op
                    ? "border-teal-600 bg-teal-50 text-teal-700 shadow-sm"
                    : "border-gray-100 text-gray-500 hover:border-gray-200"
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6 sm:mb-8">
          <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            {operator === "carte" ? "Numéro de carte" : "Numéro de téléphone"}
          </p>
          <div className="flex items-center gap-2 h-12 sm:h-14 w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">
            {operator === "carte" ? (
              <span className="flex items-center gap-2 w-full text-gray-600 font-mono text-sm sm:text-base">
                <CreditCard size={16} className="text-gray-400 shrink-0" />
                <span className="tracking-widest overflow-hidden text-ellipsis whitespace-nowrap">**** **** 4242</span>
              </span>
            ) : (
              <>
                <span className="text-gray-400 font-mono text-sm sm:text-base shrink-0">🇸🇳 +221</span>
                <span className="font-mono text-sm sm:text-base whitespace-nowrap">77 123 45 67</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => state === "idle" && setState("pending")}
        disabled={state !== "idle"}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white transition-all shadow-lg ${
          state === "idle"
            ? "bg-teal-600 hover:bg-teal-700 active:scale-95 shadow-teal-600/30"
            : state === "pending"
            ? "bg-amber-500 shadow-amber-500/30"
            : state === "success"
            ? "bg-emerald-500 shadow-emerald-500/30"
            : "bg-red-500 shadow-red-500/30"
        }`}
      >
        {state === "idle" && "Payer 15 000 FCFA"}
        {state === "pending" && (
          <>
            <Spinner size="sm" className="-ml-1 mr-2" />
            Validation...
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle size={18} /> Succès
          </>
        )}
      </button>
    </div>
  );
}

// ── DELIVERY TIMELINE ──
export function DeliveryTimeline() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s >= 3 ? 0 : s + 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: "Paiement reçu", icon: CreditCard, desc: "Instantané" },
    { label: "Facture générée", icon: CheckCircle, desc: "Automatique" },
    { label: "Lien envoyé", icon: MessageCircle, desc: "Email & WhatsApp" },
    { label: "Produit consommé", icon: Download, desc: "Le client est ravi" },
  ];

  return (
    <div className="flex h-full w-full flex-col rounded-[2rem] bg-white p-6 sm:p-8 shadow-xl border border-gray-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
      <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-6 sm:mb-8 relative z-10">Pendant que tu dors...</h3>
      <div className="relative flex-1">
        <div className="absolute bottom-4 left-[15px] sm:left-[19px] top-4 w-[2px] bg-gray-100 rounded-full" />
        <div className="space-y-6 sm:space-y-8">
          {steps.map((s, i) => {
            const active = i <= step;
            const current = i === step;
            return (
              <div key={i} className="relative flex items-start gap-4 sm:gap-5">
                <div
                  className={`relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                    active ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <s.icon size={16} />
                  {current && (
                    <span className="absolute inset-0 rounded-full border-2 border-teal-600 animate-ping opacity-75" />
                  )}
                </div>
                <div className="mt-0.5 sm:mt-1">
                  <span
                    className={`block text-sm sm:text-base font-bold transition-colors duration-500 ${
                      active ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span
                    className={`block text-xs sm:text-sm mt-0.5 transition-colors duration-500 ${
                      active ? "text-gray-500" : "text-gray-300"
                    }`}
                  >
                    {s.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── BOOKING GRID ──
export function BookingGrid() {
  const [selected, setSelected] = useState<number | null>(null);
  const times = ["09:00", "10:30", "14:00", "15:30"];
  const days = [
    { name: "Lun", date: "12" },
    { name: "Mar", date: "13" },
    { name: "Mer", date: "14", active: true },
    { name: "Jeu", date: "15" },
    { name: "Ven", date: "16" }
  ];

  return (
    <div className="flex h-full w-full flex-col justify-between rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-gray-100">
      {/* Header minimal */}
      <div>
        <div className="mb-6 sm:mb-8">
          <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight">Coaching Individuel</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 font-medium">60 min • Google Meet • 35 000 F</p>
        </div>

        {/* Jours */}
        <div className="mb-5 sm:mb-6 flex gap-2">
          {days.map((day) => (
            <div
              key={day.name}
              className={`flex-1 flex flex-col items-center rounded-xl py-2.5 sm:py-3 text-[10px] sm:text-xs transition-all ${
                day.active
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "bg-gray-50 text-gray-400"
              }`}
            >
              <span className="uppercase font-bold tracking-wider text-[8px] sm:text-[9px] mb-0.5">{day.name}</span>
              <span className={`text-base sm:text-lg font-black ${day.active ? "text-white" : "text-gray-600"}`}>{day.date}</span>
            </div>
          ))}
        </div>

        {/* Créneaux */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {times.map((t, i) => (
            <button
              key={t}
              onClick={() => setSelected(i)}
              className={`rounded-xl py-3 sm:py-3.5 text-xs sm:text-sm font-bold transition-all ${
                selected === i
                  ? "bg-teal-50 text-teal-700 ring-2 ring-teal-600"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        disabled={selected === null}
        className={`mt-6 sm:mt-8 w-full rounded-xl py-3.5 sm:py-4 text-sm sm:text-base font-bold transition-all ${
          selected !== null
            ? "bg-gray-900 text-white active:scale-95"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        Réserver ce créneau
      </button>
    </div>
  );
}

// ── TELEGRAM WIDGET ──
export function TelegramWidget() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-full w-full flex-col justify-center items-center rounded-3xl bg-gray-50 p-6 sm:p-8 shadow-xl border border-gray-100 relative overflow-hidden">
      {/* Container "Mobile" */}
      <div className="w-full max-w-[280px] bg-white rounded-[2rem] shadow-2xl border-4 border-gray-100 overflow-hidden relative z-10 flex flex-col h-[350px]">
        
        {/* Header App */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
              <MessageCircle size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-black text-gray-900 leading-tight">Canal VIP</div>
              <div className="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span> Bot
              </div>
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 bg-gray-50/50 p-5 flex flex-col gap-4 relative overflow-hidden">
          
          {/* Bulle 1 : Paiement validé */}
          <div className={`transition-all duration-700 transform ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                  <Check size={14} strokeWidth={3} />
                </div>
                <span className="text-sm font-bold text-gray-900">Paiement validé</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Voici votre lien d&apos;accès exclusif au canal. 
              </p>
              
              {/* Bulle 2 : Lien d'invitation avec délai */}
              <div className={`mt-4 transition-all duration-700 delay-300 ${step >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <div className="text-sm font-bold text-gray-900 mb-0.5">Rejoindre Canal VIP</div>
                  <div className="text-[10px] text-gray-400 font-medium mb-3">Lien à usage unique</div>
                  <button className="w-full py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20">
                    Ouvrir Telegram
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action utilisateur : A rejoint le canal */}
          <div className={`mt-auto self-center transition-all duration-700 delay-500 transform ${step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="bg-white/80 backdrop-blur-md rounded-full px-4 py-1.5 text-[10px] font-bold text-gray-400 border border-gray-100 shadow-sm">
              Vous avez rejoint le canal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ANIMATED FRICTION CIRCLE ──
export function AnimatedFrictionCircle() {
  const [value, setValue] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;

          const duration = 2500;
          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(100 * (1 - eased)));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);

          if (textRef.current) {
            textRef.current.style.transition = "color 1.5s ease-out";
            textRef.current.style.color = "#fbbf24";
            setTimeout(() => {
              if (textRef.current) {
                textRef.current.style.transition = "color 1s ease-out";
                textRef.current.style.color = "#10b981";
              }
            }, 1500);
          }
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative inline-flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 mb-8 sm:mb-10 lg:mb-12 group">
      {/* Glowing dynamic background */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30 transition-colors duration-300"
        style={{ backgroundColor: value < 20 ? '#10b981' : value < 60 ? '#fbbf24' : '#ef4444' }} 
      />
      
      {/* Premium Outer Circle (No border) */}
      <div 
        className="absolute inset-0 rounded-full bg-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15),inset_0_4px_8px_rgba(0,0,0,0.05)] transition-all"
      />
      
      {/* Central Typography */}
      <div className="relative z-10 flex items-baseline">
        <span 
          ref={textRef}
          className="text-4xl sm:text-5xl font-black tracking-tighter" 
          style={{ fontVariantNumeric: 'tabular-nums', color: '#ef4444' }}
        >
          {value}
        </span>
        <span className="text-xl sm:text-2xl font-bold text-gray-400 ml-1">%</span>
      </div>
      
      {/* Top right icon badge - Sleek Dark Mode */}
      <div className="absolute -right-2 -top-2 w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-full flex items-center justify-center shadow-lg border-[3px] sm:border-4 border-white z-20 transition-transform duration-500 hover:scale-110 hover:rotate-12 hover:shadow-xl">
        <Zap size={18} className="text-amber-400 fill-amber-400/40 animate-pulse sm:w-6 sm:h-6" />
      </div>
      
      {/* Bottom pill-shaped label */}
      <div className="absolute -bottom-4 bg-gray-900 text-white text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full shadow-lg border border-gray-700 z-20 whitespace-nowrap overflow-hidden transition-transform duration-300 hover:-translate-y-1">
        Friction
      </div>
    </div>
  );
}

// ── FLOATING CTA (needs scroll listener) ──
export function FloatingMobileCTA({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> }) {
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        setShowFloatingCTA(heroBottom < 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [heroRef]);

  return (
    <div className={`fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/80 backdrop-blur-xl border-t border-gray-200 sm:hidden z-[100] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] [will-change:transform] ${showFloatingCTA ? 'translate-y-0' : 'translate-y-[150%]'}`}>
      <Link
        href="/signup"
        className="relative flex items-center justify-center gap-2 w-full rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-teal-600/20 active:scale-95 transition-transform animate-pulse-teal overflow-hidden group"
      >
        <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine group-hover:via-white/50"></div>
        <span className="relative z-10">Créer ma page (Gratuit)</span>
        <ArrowRight size={16} className="relative z-10" />
      </Link>
    </div>
  );
}

// ── HERO REF WRAPPER (client component that provides ref) ──
export function HeroSection({ children }: { children: React.ReactNode }) {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={heroRef}>
        {children}
      </div>
      <FloatingMobileCTA heroRef={heroRef} />
    </>
  );
}
