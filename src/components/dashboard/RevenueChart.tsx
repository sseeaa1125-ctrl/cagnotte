import { useMemo } from "react";
import { formatPrice } from "@/lib/utils";

interface RevenueChartProps {
  data: { date: string; amount: number; count: number }[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const maxAmount = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map((d) => d.amount));
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[200px] w-full items-end justify-between gap-2 animate-pulse">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="w-full bg-gray-100 rounded-t-sm" style={{ height: `${Math.max(10, 20 + (i % 5) * 15)}%` }} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
        <p className="text-sm text-gray-400 font-medium">Pas de données pour cette période</p>
      </div>
    );
  }

  return (
    <div className="flex h-[200px] w-full items-end justify-between gap-1 sm:gap-2">
      {data.map((day) => {
        const heightPercent = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
        const isToday = new Date(day.date).toDateString() === new Date().toDateString();
        
        return (
          <div key={day.date} className="group relative flex w-full flex-col items-center justify-end h-full">
            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-12 z-10 w-max rounded-xl bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              <p className="font-bold">{formatPrice(day.amount)}</p>
              <p className="text-[10px] text-gray-300">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {day.count} vente{day.count > 1 ? 's' : ''}</p>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
            
            {/* Bar */}
            <div 
              className={`w-full rounded-t-md transition-all duration-500 ease-out group-hover:opacity-80 ${isToday ? 'bg-teal-500' : 'bg-teal-100 hover:bg-teal-200'}`}
              style={{ 
                height: `${Math.max(4, heightPercent)}%`,
                minHeight: '4px'
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
