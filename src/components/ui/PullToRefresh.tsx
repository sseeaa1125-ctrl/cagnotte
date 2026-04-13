"use client";

import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;
  const opacity = Math.min(progress * 1.5, 1);

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: pullDistance }}
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 ${
          isRefreshing ? "animate-spin" : ""
        }`}
        style={{
          opacity,
          transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
        }}
      >
        <RefreshCw size={20} className="text-teal-600" />
      </div>
    </div>
  );
}
