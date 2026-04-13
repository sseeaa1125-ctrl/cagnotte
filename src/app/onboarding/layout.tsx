"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AuthProvider } from "@/contexts/AuthContext";
import gsap from "gsap";

function AnimatedLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const topArc = svgRef.current?.querySelector(".top-arc");
      const bottomArc = svgRef.current?.querySelector(".bottom-arc");
      const centerRect = svgRef.current?.querySelector(".center-rect");

      if (!topArc || !bottomArc || !centerRect) return;

      gsap.set([topArc, bottomArc, centerRect], {
        opacity: 0,
        transformOrigin: "50% 50%",
      });

      gsap.set(topArc, { y: -30, scale: 0.8, rotation: -15 });
      gsap.set(bottomArc, { y: 30, scale: 0.8, rotation: 15 });
      gsap.set(centerRect, { scaleY: 0, opacity: 0 });
      
      if (textRef.current) {
        gsap.set(textRef.current, { opacity: 0, x: -10 });
      }

      const tl = gsap.timeline({ delay: 0.1 });

      tl.to(centerRect, {
        scaleY: 1,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(1.5)"
      })
      .to(
        [topArc, bottomArc],
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 0.8,
          ease: "elastic.out(1, 0.5)",
          stagger: 0.1,
        },
        "-=0.3"
      )
      // Pulse / Morph effect (organic squeeze)
      .to(
        svgRef.current,
        {
          scaleX: 1.08,
          scaleY: 0.92,
          duration: 0.2,
          ease: "sine.inOut"
        },
        "-=0.2"
      )
      .to(
        svgRef.current,
        {
          scaleX: 0.95,
          scaleY: 1.05,
          duration: 0.3,
          ease: "sine.inOut"
        }
      )
      .to(
        svgRef.current,
        {
          scaleX: 1,
          scaleY: 1,
          duration: 0.4,
          ease: "elastic.out(1.2, 0.4)"
        }
      );

      if (textRef.current) {
        tl.to(
          textRef.current,
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            ease: "back.out(1.2)"
          },
          "-=1.3" // Align with the arcs animation
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      <svg
        ref={svgRef}
        viewBox="0 0 382.79 428.74"
        className="w-8 h-8 sm:w-10 sm:h-10 relative z-10 drop-shadow-sm"
        style={{ overflow: "visible" }}
      >
        <path
          className="bottom-arc fill-teal-600"
          d="M302.06,167.41v73.94c0,44.2-35.96,80.16-80.16,80.16h-53.06c-44.2,0-80.16-35.97-80.16-80.16v-73.94h22.36v73.94c0,31.87,25.93,57.8,57.8,57.8h53.06c31.88,0,57.8-25.93,57.8-57.8v-73.94h22.36Z"
        />
        <rect
          className="center-rect fill-amber-400"
          x="184.19"
          y="167.41"
          width="22.36"
          height="86.16"
          rx="11.18"
        />
        <path
          className="top-arc fill-teal-600"
          d="M255.43,140.15v77.36h-22.36v-77.36c0-8.55-3.77-16.65-10.62-22.82-7.17-6.46-16.79-10.02-27.08-10.02-20.79,0-37.7,14.73-37.7,32.84v77.36h-22.36v-77.36c0-30.44,26.95-55.2,60.06-55.2,15.82,0,30.76,5.6,42.05,15.77,11.62,10.46,18.01,24.47,18.01,39.44Z"
        />
      </svg>
      <span ref={textRef} className="text-[22px] sm:text-[26px] font-black tracking-tighter text-teal-800 leading-none pb-0.5">
        izy.store
      </span>
    </div>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 font-sans selection:bg-teal-200 selection:text-teal-900">
      {/* Header */}
      <header className="flex items-center justify-center pt-3 pb-2 px-4">
        <Link href="/" className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0">
          <AnimatedLogo />
        </Link>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-4 pb-4 sm:px-6 sm:pb-12">
        <div className="w-full max-w-[520px]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <OnboardingShell>{children}</OnboardingShell>
    </AuthProvider>
  );
}
