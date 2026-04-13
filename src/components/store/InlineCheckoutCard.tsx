"use client";

import { useState, type ReactNode } from "react";
import { CheckoutCTA } from "@/components/store/CheckoutCTA";
import type { Block } from "@/types";

interface InlineCheckoutCardProps {
  block: Block;
  sellerSlug: string;
  sellerTimezone: string;
  sellerName?: string;
  buttonText: string;
  price: number;
  discountPrice: number | null;
  children: ReactNode;
}

export function InlineCheckoutCard({
  block,
  sellerSlug,
  sellerTimezone,
  sellerName,
  buttonText,
  price,
  discountPrice,
  children,
}: InlineCheckoutCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-pointer"
        style={{
          borderRadius: "var(--theme-card-radius, 16px)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      {open && (
        <CheckoutCTA
          block={block}
          sellerSlug={sellerSlug}
          sellerTimezone={sellerTimezone}
          sellerName={sellerName}
          buttonText={buttonText}
          price={price}
          discountPrice={discountPrice}
          inline
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}
