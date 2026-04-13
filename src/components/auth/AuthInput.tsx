import { InputHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  hint?: React.ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, leftIcon, hint, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="space-y-1.5 w-full">
        {label && <label className="text-[13px] font-bold text-gray-700">{label}</label>}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-4 text-sm text-gray-400 font-medium pointer-events-none select-none flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 text-sm font-medium text-gray-900 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 placeholder:text-gray-400",
              leftIcon ? "pl-[78px] pr-4" : "px-4",
              isPassword && "pr-12",
              error && "border-red-300 focus:border-red-500 focus:ring-red-500/10",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-600"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {hint && <p className="text-[11px] text-gray-500 font-medium ml-1 mt-1">{hint}</p>}
        {error && <p className="text-[11px] font-medium text-red-600 ml-1 mt-1" role="alert">{error}</p>}
      </div>
    );
  }
);
AuthInput.displayName = "AuthInput";
