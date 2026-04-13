"use client";

import { useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}

export function PinInput({
  value,
  onChange,
  length = 4,
  error = false,
  disabled = false,
  autoFocus = false,
  label,
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(length, "").split("").slice(0, length);

  const focusInput = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, length - 1));
    inputRefs.current[clamped]?.focus();
  }, [length]);

  const handleChange = useCallback(
    (index: number, digit: string) => {
      if (!/^\d$/.test(digit)) return;
      const arr = value.padEnd(length, " ").split("").slice(0, length);
      arr[index] = digit;
      const newValue = arr.join("").replace(/ /g, "");
      onChange(newValue);
      if (index < length - 1) {
        focusInput(index + 1);
      }
    },
    [value, length, onChange, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const arr = value.padEnd(length, " ").split("").slice(0, length);
        if (arr[index] !== " ") {
          arr[index] = " ";
          onChange(arr.join("").replace(/ /g, ""));
        } else if (index > 0) {
          arr[index - 1] = " ";
          onChange(arr.join("").replace(/ /g, ""));
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [value, length, onChange, focusInput]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (pasted.length > 0) {
        onChange(pasted);
        focusInput(Math.min(pasted.length, length - 1));
      }
    },
    [length, onChange, focusInput]
  );

  return (
    <div>
      {label && (
        <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      )}
      <div className="flex justify-center gap-3">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete="one-time-code"
            aria-label={`Chiffre ${i + 1}`}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            value={digits[i]?.trim() || ""}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length === 1) handleChange(i, val);
            }}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={[
              "h-14 w-12 rounded-2xl border-2 bg-white text-center text-2xl font-bold outline-none transition-all duration-150",
              "focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:scale-105",
              error
                ? "border-red-300 text-red-600 bg-red-50"
                : digits[i]?.trim()
                  ? "border-teal-400 text-gray-900"
                  : "border-gray-200 text-gray-900",
              disabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
