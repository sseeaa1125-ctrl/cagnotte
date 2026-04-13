"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface LandingLoaderProps {
  onComplete?: () => void;
}

export default function LandingLoader({ onComplete }: LandingLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Prevent scrolling while loading
    document.body.style.overflow = "hidden";

    const ctx = gsap.context(() => {
      const topArc = svgRef.current?.querySelector(".top-arc");
      const bottomArc = svgRef.current?.querySelector(".bottom-arc");
      const centerRect = svgRef.current?.querySelector(".center-rect");
      const bg = containerRef.current;

      if (!topArc || !bottomArc || !centerRect || !bg) return;

      const tl = gsap.timeline({
        onComplete: () => {
          setIsLoaded(true);
          document.body.style.overflow = "auto";
          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 100);
          if (onComplete) onComplete();
        },
      });

      // Set initial states
      gsap.set([topArc, bottomArc, centerRect], {
        opacity: 0,
        transformOrigin: "50% 50%",
      });

      gsap.set(topArc, { y: -50, scale: 0.8, rotation: -15 });
      gsap.set(bottomArc, { y: 50, scale: 0.8, rotation: 15 });
      gsap.set(centerRect, { scaleY: 0, opacity: 0 });

      // Build the animation
      tl.to(centerRect, {
        scaleY: 1,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(1.5)",
        delay: 0.2,
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
        "+=0.2"
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
      )
      // Reveal transiton
      .to(
        svgRef.current,
        {
          scale: 0.8,
          y: -50,
          opacity: 0,
          duration: 0.5,
          ease: "power3.in"
        },
        "+=0.2"
      )
      .to(
        bg,
        {
          yPercent: -100,
          duration: 0.8,
          ease: "power4.inOut",
          borderBottomLeftRadius: "50% 10%",
          borderBottomRightRadius: "50% 10%",
        },
        "-=0.1"
      );
    }, containerRef);

    return () => {
      ctx.revert();
      document.body.style.overflow = "auto";
    };
  }, [onComplete]);

  if (isLoaded) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden bg-teal-600"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-teal-400 via-teal-600 to-teal-700 pointer-events-none"></div>
      
      <svg
        ref={svgRef}
        viewBox="0 0 382.79 428.74"
        className="w-32 h-32 sm:w-40 sm:h-40 relative z-10 drop-shadow-2xl"
        style={{ overflow: "visible" }}
      >
        <path
          className="bottom-arc fill-white"
          d="M302.06,167.41v73.94c0,44.2-35.96,80.16-80.16,80.16h-53.06c-44.2,0-80.16-35.97-80.16-80.16v-73.94h22.36v73.94c0,31.87,25.93,57.8,57.8,57.8h53.06c31.88,0,57.8-25.93,57.8-57.8v-73.94h22.36Z"
        />
        <rect
          className="center-rect fill-amber-400"
          x="184.19"
          y="167.41"
          width="22.36"
          height="86.16"
          rx="11.18" /* Optional: adding rounded corners makes it pop visually during scaling */
        />
        <path
          className="top-arc fill-white"
          d="M255.43,140.15v77.36h-22.36v-77.36c0-8.55-3.77-16.65-10.62-22.82-7.17-6.46-16.79-10.02-27.08-10.02-20.79,0-37.7,14.73-37.7,32.84v77.36h-22.36v-77.36c0-30.44,26.95-55.2,60.06-55.2,15.82,0,30.76,5.6,42.05,15.77,11.62,10.46,18.01,24.47,18.01,39.44Z"
        />
      </svg>
    </div>
  );
}
