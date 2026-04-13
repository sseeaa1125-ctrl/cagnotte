"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-lg",
  "2xl": "h-[120px] w-[120px] text-2xl",
};

const pixelMap = { sm: 32, md: 40, lg: 56, xl: 80, "2xl": 120 };

function InitialsFallback({ alt, size, className }: { alt: string; size: string; className?: string }) {
  const initials = alt
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold",
        size,
        className
      )}
      style={{
        backgroundColor: "var(--theme-avatar-bg, #CCFBF1)",
        color: "var(--theme-avatar-text, #0F766E)",
      }}
      aria-label={alt}
    >
      {initials}
    </div>
  );
}

export function Avatar({ src, alt, size = "md", className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return <InitialsFallback alt={alt} size={sizeMap[size]} className={className} />;
  }

  const px = pixelMap[size];
  return (
    <Image
      src={src}
      alt={alt}
      width={px}
      height={px}
      referrerPolicy="no-referrer"
      unoptimized
      onError={() => setImgError(true)}
      className={cn(
        "rounded-full object-cover",
        sizeMap[size],
        className
      )}
    />
  );
}
