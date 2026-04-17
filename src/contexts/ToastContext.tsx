"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
});

const TOAST_DURATION = 3000;
const FADE_OUT_DURATION = 300;

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    }, TOAST_DURATION);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION + FADE_OUT_DURATION);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast: addToast }}>
      {children}
      {/* Toast container */}
      <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-medium shadow-lg transition-all ${
                t.exiting
                  ? "animate-[slideOutUp_0.3s_ease-in_forwards]"
                  : "animate-[slideInDown_0.3s_ease-out]"
              } ${
                t.type === "success"
                  ? "border-green-200 bg-white text-primary"
                  : t.type === "error"
                    ? "border-red-200 bg-white text-red-700"
                    : "border-gray-200 bg-white text-primary"
              }`}
              style={{ maxWidth: "90vw" }}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                t.type === "success"
                  ? "bg-green-100 text-green-600"
                  : t.type === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-primary"
              }`}>
                <Icon size={16} />
              </div>
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
