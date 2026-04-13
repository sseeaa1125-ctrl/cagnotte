"use client";

import * as React from "react";
import { Facebook, Mail, Copy, Check, Share2 } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { ACTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ShareTarget =
  | "whatsapp"
  | "facebook"
  | "email"
  | "copy"
  | "native";

export interface ShareSheetProps {
  url: string;
  title: string;
  description?: string;
  onShare?: (target: ShareTarget) => void;
  className?: string;
}

/**
 * Inline WhatsApp SVG icon (simple-icons path).
 * No new npm dep; lucide doesn't ship a WhatsApp glyph.
 */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967c-.273-.099-.471-.148-.67.15c-.197.297-.767.966-.94 1.164c-.173.199-.347.223-.644.075c-.297-.15-1.255-.463-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.298-.347.446-.52c.149-.174.198-.298.298-.497c.099-.198.05-.371-.025-.52c-.075-.149-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51c-.173-.008-.371-.01-.57-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625c.712.227 1.36.195 1.871.118c.571-.085 1.758-.719 2.006-1.413c.248-.694.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413"
      />
    </svg>
  );
}

export function ShareSheet({
  url,
  title,
  description,
  onShare,
  className,
}: ShareSheetProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${title} — ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    onShare?.("whatsapp");
  };

  const handleFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
    onShare?.("facebook");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${description || ""}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    onShare?.("email");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(ACTIONS.copie, "success");
      onShare?.("copy");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable inside some in-app browsers
    }
  };

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleNative = async () => {
    try {
      await navigator.share({ title, text: description, url });
      onShare?.("native");
    } catch {
      // user cancelled or share API failed — no-op
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {canNativeShare ? (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          iconLeft={<Share2 size={18} />}
          onClick={handleNative}
        >
          {ACTIONS.partager}
        </Button>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* WhatsApp FIRST — Senegalese priority */}
        <Button
          variant="social"
          socialProvider="whatsapp"
          iconLeft={<WhatsAppIcon className="h-5 w-5 fill-current" />}
          onClick={handleWhatsApp}
          fullWidth
        >
          WhatsApp
        </Button>

        <Button
          variant="social"
          socialProvider="facebook"
          iconLeft={<Facebook size={18} />}
          onClick={handleFacebook}
          fullWidth
        >
          Facebook
        </Button>

        <Button
          variant="outline"
          iconLeft={<Mail size={18} />}
          onClick={handleEmail}
          fullWidth
        >
          Email
        </Button>

        <Button
          variant="outline"
          iconLeft={copied ? <Check size={18} /> : <Copy size={18} />}
          onClick={handleCopy}
          fullWidth
        >
          {copied ? ACTIONS.copie : ACTIONS.copier}
        </Button>
      </div>
    </div>
  );
}
