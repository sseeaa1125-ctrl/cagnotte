"use client";

import { useState } from "react";
import Image from "next/image";

interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fallback?: React.ReactNode;
}

export function SafeImage({ src, alt, fill, width, height, className, priority, sizes, quality, fallback }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return fallback ? <>{fallback}</> : null;
  }

  // Calcul auto de sizes pour les images fill sans sizes explicite
  // Évite que Next.js génère un srcset pour 100vw (trop gros pour les thumbnails)
  const computedSizes = sizes || (fill ? "(max-width: 768px) 100vw, 50vw" : undefined);

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      priority={priority}
      sizes={computedSizes}
      quality={quality || 75}
      onError={() => setError(true)}
    />
  );
}
