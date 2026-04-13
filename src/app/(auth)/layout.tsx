"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { AuthSkeleton } from "@/components/ui";
import gsap from "gsap";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // FL1: Redirect already-authenticated users away from login/signup
  useEffect(() => {
    api<{ seller: { onboardingCompleted?: boolean } }>("/api/auth/me")
      .then((res) => {
        router.replace(res.seller.onboardingCompleted === false ? "/onboarding" : "/dashboard/blocks");
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Appearance Animation when loading is complete
  useEffect(() => {
    if (!checking && containerRef.current) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        // Subtle background scale-in for the left image
        gsap.fromTo(
          ".auth-bg-image",
          { scale: 1.1, opacity: 0 },
          { scale: 1, opacity: 0.1, duration: 2, ease: "power2.out" }
        );

        // Stagger left content, then right content
        tl.from(
          ".auth-stagger",
          { y: 30, opacity: 0, duration: 1, stagger: 0.1 }
        );

        // Title text word-by-word reveal (SplitText native alternative)
        document.fonts.ready.then(() => {
          gsap.from(".animate-word", {
            opacity: 0,
            duration: 2,
            ease: "sine.out",
            stagger: 0.1,
          });
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [checking]);

  if (checking) {
    return <AuthSkeleton />;
  }

  const marketingTitle = "Ton lien en bio, surpuissant.";

  return (
    <div ref={containerRef} className="min-h-[100dvh] flex font-sans selection:bg-teal-200 selection:text-teal-900 bg-white">
      
      {/* Left Side: Branding / Visuals (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col justify-between bg-zinc-950 p-12 relative overflow-hidden">
        {/* Abstract dark background and luminous gradients */}
        <div className="auth-bg-image absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity pointer-events-none z-0"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-teal-500/20 blur-[100px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none z-0"></div>

        <div className="relative z-10 auth-stagger">
          <Link href="/" className="inline-flex items-center transition-transform hover:scale-105 active:scale-95 shrink-0">
            <Image 
              src="/logo/1x/Logo Izy.store texte blanc.png" 
              alt="Izy.store" 
              width={160} 
              height={48} 
              className="w-[120px] lg:w-[140px] h-auto object-contain"
              priority
            />
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mb-12">
          <h2 className="text-[2.5rem] font-black text-white leading-[1.05] tracking-tight mb-6 auth-stagger flex flex-wrap gap-x-[0.25em]">
            {marketingTitle.split(" ").map((word, index) => (
              <span key={index} className="animate-word inline-block">
                {word}
              </span>
            ))}
          </h2>
          <p className="text-lg text-zinc-400 font-medium leading-relaxed mb-10 auth-stagger">
            Crée ta page, regroupe tes liens, vends tes produits et sois payé directement par Mobile Money ou Carte Bancaire. Aucune compétence requise.
          </p>
          
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 auth-stagger">
            <div className="flex -space-x-2.5">
              {[
                { name: "Amadou", src: "/testimonial/testimonial_pic_8.avif" },
                { name: "Mohamed", src: "/testimonial/testimonial_pic_4_mohamed.jpeg" },
                { name: "Fatou", src: "/testimonial/testimonial_pic_3.avif" }
              ].map((user) => (
                <img
                  key={user.name}
                  src={user.src}
                  alt={user.name}
                  className="w-11 h-11 rounded-full border-2 border-zinc-900 bg-zinc-800 object-cover"
                />
              ))}
            </div>
            <div className="text-sm">
              <div className="text-white font-bold tracking-wide">Rejoins +500 créateurs</div>
              <div className="text-zinc-400 font-medium">qui cartonnent en Afrique.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Forms */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative overflow-y-auto w-full lg:w-1/2">
        {/* Mobile Logo Only */}
        <Link href="/" className="lg:hidden mb-12 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 auth-stagger shrink-0">
          <Image 
            src="/logo/1x/Logo Izy.store.png" 
            alt="Izy.store" 
            width={160} 
            height={48} 
            className="w-[130px] h-auto object-contain"
            priority
          />
        </Link>

        {/* Clean, shadow-free container on desktop, subtle on mobile if needed, but here we just let it float pure white */}
        <div className="w-full max-w-[420px] mx-auto bg-white/50 sm:bg-transparent rounded-3xl p-4 sm:p-0 auth-stagger">
          {children}
        </div>
      </div>

    </div>
  );
}
