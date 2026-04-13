"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PaymentMethodsSection from "@/components/landing/PaymentMethodsSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import AutomatedSalesSection from "@/components/landing/AutomatedSalesSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import FloatingCTA from "@/components/landing/FloatingCTA";
import LandingLoader from "@/components/landing/LandingLoader";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current && footerRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        const footerTop = footerRef.current.getBoundingClientRect().top;
        const viewportHeight = window.innerHeight;
        
        // Show CTA if hero is out of view AND footer is not yet fully visible
        // Added +100 to ensure it hides slightly before the footer appears
        setShowFloatingCTA(heroBottom < 100 && footerTop > viewportHeight + 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-teal-200 selection:text-teal-900 w-full overflow-x-hidden">
      <LandingLoader />
      <Navbar />
      <HeroSection ref={heroRef} />
      <FeaturesSection />
      <TestimonialsSection />
      <PaymentMethodsSection />
      <ComparisonSection />
      <AutomatedSalesSection />
      <PricingSection />
      <FAQSection />
      <Footer ref={footerRef} />
      <FloatingCTA showFloatingCTA={showFloatingCTA} />
    </div>
  );
}
