import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "teal";
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  animateShine?: boolean;
}

export function AuthButton({
  children,
  variant = "primary",
  loading = false,
  loadingText = "Chargement...",
  icon,
  animateShine = false,
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  const baseClasses = "relative w-full flex items-center justify-center gap-2 rounded-2xl py-4 px-6 text-[15px] font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group";
  
  const variants = {
    primary: "bg-teal-500 hover:bg-teal-600 text-white", // Default to teal
    teal: "bg-teal-500 hover:bg-teal-600 text-white", // Same as primary now
    secondary: "bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700",
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {animateShine && !disabled && !loading && (
        <div className="absolute inset-0 w-1/3 bg-linear-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-shine group-hover:via-white/70"></div>
      )}
      
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <>
            <Spinner size="sm" className="-ml-1 mr-2" />
            {loadingText}
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </span>
    </button>
  );
}
