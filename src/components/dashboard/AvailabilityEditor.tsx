"use client";

import { Plus, Trash2, Copy } from "lucide-react";
import { TimePicker } from "@/components/ui/TimePicker";

export interface SlotRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface AvailabilityEditorProps {
  slots: SlotRow[];
  onChange: (slots: SlotRow[]) => void;
}

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

function uid() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AvailabilityEditor({ slots, onChange }: AvailabilityEditorProps) {
  // Group slots by day
  function slotsForDay(day: number): SlotRow[] {
    return slots
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function isDayActive(day: number): boolean {
    return slots.some((s) => s.dayOfWeek === day);
  }

  // Toggle day on/off
  function toggleDay(day: number) {
    if (isDayActive(day)) {
      onChange(slots.filter((s) => s.dayOfWeek !== day));
    } else {
      onChange([
        ...slots,
        { id: uid(), dayOfWeek: day, startTime: "09:00", endTime: "17:00" },
      ]);
    }
  }

  // Add a slot to a day
  function addSlotToDay(day: number) {
    const daySlots = slotsForDay(day);
    const lastSlot = daySlots[daySlots.length - 1];
    // Smart default: start 1h after previous end
    let start = "09:00";
    let end = "17:00";
    if (lastSlot) {
      const [h] = lastSlot.endTime.split(":").map(Number);
      start = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:00`;
      end = `${String(Math.min(h + 3, 23)).padStart(2, "0")}:00`;
    }
    onChange([...slots, { id: uid(), dayOfWeek: day, startTime: start, endTime: end }]);
  }

  // Remove a specific slot
  function removeSlot(id: string) {
    onChange(slots.filter((s) => s.id !== id));
  }

  // Update a slot's time
  function updateSlot(id: string, field: "startTime" | "endTime", value: string) {
    onChange(slots.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  // Copy day's schedule to all empty weekdays
  function copyToWeekdays(sourceDay: number) {
    const sourceSlots = slotsForDay(sourceDay);
    if (sourceSlots.length === 0) return;

    const weekdays = [1, 2, 3, 4, 5];
    let newSlots = [...slots];

    for (const day of weekdays) {
      if (day === sourceDay) continue;
      // Remove existing slots for this day
      newSlots = newSlots.filter((s) => s.dayOfWeek !== day);
      // Copy source slots
      for (const src of sourceSlots) {
        newSlots.push({
          id: uid(),
          dayOfWeek: day,
          startTime: src.startTime,
          endTime: src.endTime,
        });
      }
    }
    onChange(newSlots);
  }

  const activeDayCount = DAYS.filter((d) => isDayActive(d.value)).length;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {activeDayCount === 0
            ? "Active les jours où tu es disponible."
            : `${activeDayCount} jour${activeDayCount > 1 ? "s" : ""} actif${activeDayCount > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Day rows */}
      <div className="space-y-0 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {DAYS.map((day) => {
          const active = isDayActive(day.value);
          const daySlots = slotsForDay(day.value);

          return (
            <div key={day.value} className="flex flex-col sm:flex-row sm:items-start gap-3 px-4 py-3.5">
              {/* Day toggle */}
              <div className="flex items-center justify-between w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  <div
                    className={`h-5 w-9 rounded-full transition-colors relative ${
                      active ? "bg-teal-600" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        active ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span
                    className={`w-16 text-sm text-left font-semibold ${
                      active ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {day.label}
                  </span>
                </button>
                
                {/* Mobile-only copy button */}
                {active && daySlots.length > 0 && (
                  <button
                    type="button"
                    onClick={() => copyToWeekdays(day.value)}
                    className="sm:hidden rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Copier sur Lun-Ven"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>

              {/* Time slots or "Indisponible" */}
              <div className="flex-1 min-w-0">
                {!active ? (
                  <p className="text-sm text-gray-300 sm:pt-0.5">Indisponible</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot, i) => (
                      <div key={slot.id} className="flex flex-wrap items-center gap-2">
                        <TimePicker
                          value={slot.startTime}
                          onChange={(val) => updateSlot(slot.id, "startTime", val)}
                          maxTime={slot.endTime}
                        />
                        <span className="text-gray-300">–</span>
                        <TimePicker
                          value={slot.endTime}
                          onChange={(val) => updateSlot(slot.id, "endTime", val)}
                          minTime={slot.startTime}
                        />

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Remove slot (if 1 left, disables day) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (daySlots.length === 1) {
                                toggleDay(day.value);
                              } else {
                                removeSlot(slot.id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title="Supprimer ce créneau"
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* Add another slot for same day */}
                          {i === daySlots.length - 1 && (
                            <button
                              type="button"
                              onClick={() => addSlotToDay(day.value)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
                              title="Ajouter un créneau"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop copy to weekdays button */}
              {active && daySlots.length > 0 && (
                <button
                  type="button"
                  onClick={() => copyToWeekdays(day.value)}
                  className="hidden sm:block shrink-0 mt-0.5 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Copier sur Lun-Ven"
                >
                  <Copy size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {activeDayCount === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-center">
          <p className="text-xs font-medium text-amber-700">
            Active au moins un jour pour que tes clients puissent réserver.
          </p>
        </div>
      )}
    </div>
  );
}
