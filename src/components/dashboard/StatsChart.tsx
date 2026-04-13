"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltipPlugin,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltipPlugin);

interface ChartDataPoint {
  date: string;
  label: string;
  count: number;
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

interface StatsChartProps {
  chartData: ChartDataPoint[];
}

export default function StatsChart({ chartData }: StatsChartProps) {
  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-gray-400">Pas encore de données</p>
      </div>
    );
  }

  return (
    <div className="-ml-2 -mr-1" style={{ height: 200 }}>
      <Line
        data={{
          labels: chartData.map((d) => d.label),
          datasets: [{
            data: chartData.map((d) => d.count),
            borderColor: "#0D9488",
            borderWidth: 2,
            backgroundColor: "rgba(13, 148, 136, 0.08)",
            fill: true,
            tension: 0.3,
            pointRadius: chartData.length <= 14 ? 3 : 0,
            pointBackgroundColor: "#0D9488",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: "#0D9488",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            tooltip: {
              backgroundColor: "#fff",
              titleColor: "#9CA3AF",
              titleFont: { size: 10, weight: "normal" },
              bodyColor: "#111827",
              bodyFont: { size: 13, weight: "bold" },
              borderColor: "#E5E7EB",
              borderWidth: 1,
              padding: 8,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                title: (items) => {
                  const idx = items[0].dataIndex;
                  return formatTooltipDate(chartData[idx].date);
                },
                label: (item) => `${item.raw} visite${(item.raw as number) !== 1 ? "s" : ""}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 10 }, color: "#9CA3AF", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            },
            y: {
              grid: { color: "#F3F4F6", drawTicks: false },
              border: { display: false },
              ticks: { font: { size: 10 }, color: "#9CA3AF", padding: 4 },
            },
          },
        }}
      />
    </div>
  );
}
