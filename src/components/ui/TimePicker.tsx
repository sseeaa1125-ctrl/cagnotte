"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  minTime?: string;
  maxTime?: string;
  className?: string;
}

// Generate all 15-minute intervals
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export function TimePicker({ value, onChange, minTime, maxTime, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Compute dropdown position from button rect
  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  const filteredTimes = TIMES.filter((time) => {
    if (minTime && time <= minTime) return false;
    if (maxTime && time >= maxTime) return false;
    return true;
  });

  const selectedIndex = filteredTimes.indexOf(value);
  const orderedTimes =
    selectedIndex > -1
      ? [...filteredTimes.slice(selectedIndex + 1), ...filteredTimes.slice(0, selectedIndex + 1)]
      : filteredTimes;

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = dropdownRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    el.scrollTop += e.deltaY;
  }, []);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { updatePos(); setOpen(!open); }}
        className={cn(
          "flex w-[100px] sm:w-[110px] items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm font-medium transition-colors",
          open
            ? "border-teal-600 ring-2 ring-teal-600/20"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        )}
      >
        <span>{value}</span>
        <Clock size={14} className={open ? "text-teal-600" : "text-gray-400"} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] max-h-60 w-32 overflow-y-auto overscroll-contain rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl"
          style={{ top: pos.top, left: pos.left }}
          onWheel={handleWheel}
        >
          {orderedTimes.length > 0 ? (
            orderedTimes.map((time) => (
              <button
                key={time}
                type="button"
                data-selected={time === value ? "true" : undefined}
                onClick={() => {
                  onChange(time);
                  setOpen(false);
                }}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  time === value
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {time}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-gray-500 text-center">Aucune heure</p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
