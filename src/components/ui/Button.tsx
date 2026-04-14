import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger" | "social";
type Size = "md" | "lg";
type SocialProvider = "google" | "apple" | "facebook" | "whatsapp" | "email";

interface BaseButtonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  socialProvider?: SocialProvider;
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = { as?: "button" } & BaseButtonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;
type ButtonAsAnchor = { as: "a" } & BaseButtonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className">;

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

// Premium hover: elevation via shadow, subtle lift via translate, press via scale.
// All CSS-only — no Framer Motion (forbidden).
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  outline:
    "bg-background text-primary border border-primary shadow-sm hover:bg-pink/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  ghost:
    "bg-transparent text-primary hover:bg-muted active:scale-[0.98]",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  social:
    "bg-background text-primary border border-border shadow-sm hover:bg-muted hover:shadow-md active:scale-[0.98]",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "min-h-12 px-5 py-3.5 text-sm font-semibold",
  lg: "min-h-14 px-6 py-4 text-base font-semibold",
};

const SOCIAL_CLASSES: Record<SocialProvider, string> = {
  google: "",
  apple: "bg-black text-white border-black hover:bg-zinc-800",
  facebook: "bg-[#1877F2] text-white border-[#1877F2] hover:opacity-90",
  whatsapp: "bg-[#25D366] text-white border-[#25D366] hover:opacity-90",
  email: "",
};

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    socialProvider,
    className,
    children,
  } = props;

  const socialExtras =
    variant === "social" && socialProvider ? SOCIAL_CLASSES[socialProvider] : "";

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ease-out will-change-transform",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    socialExtras,
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </>
  );

  if (props.as === "a") {
    const {
      as: _as,
      variant: _v,
      size: _s,
      loading: _l,
      iconLeft: _il,
      iconRight: _ir,
      fullWidth: _fw,
      socialProvider: _sp,
      className: _cn,
      children: _c,
      ...anchorRest
    } = props;
    void _as;
    void _v;
    void _s;
    void _l;
    void _il;
    void _ir;
    void _fw;
    void _sp;
    void _cn;
    void _c;
    // SPA navigation: internal hrefs (starting with "/") use next/link Link
    // for client-side routing. External / mailto / tel fall back to plain <a>.
    const href = typeof anchorRest.href === "string" ? anchorRest.href : undefined;
    const isInternal =
      typeof href === "string" &&
      href.startsWith("/") &&
      !href.startsWith("//");
    if (isInternal) {
      const { href: _h, ...linkRest } = anchorRest;
      void _h;
      return (
        <Link href={href as string} className={classes} {...linkRest}>
          {content}
        </Link>
      );
    }
    return (
      <a className={classes} {...anchorRest}>
        {content}
      </a>
    );
  }

  const {
    as: _as,
    variant: _v,
    size: _s,
    loading: _l,
    iconLeft: _il,
    iconRight: _ir,
    fullWidth: _fw,
    socialProvider: _sp,
    className: _cn,
    children: _c,
    disabled,
    type = "button",
    ...buttonRest
  } = props;
  void _as;
  void _v;
  void _s;
  void _l;
  void _il;
  void _ir;
  void _fw;
  void _sp;
  void _cn;
  void _c;

  return (
    <button
      type={type}
      className={classes}
      disabled={loading || disabled}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
