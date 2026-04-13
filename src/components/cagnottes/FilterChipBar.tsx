import * as React from "react";
import { Tabs, type TabItem } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface FilterChipBarProps {
  filters: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterChipBar({
  filters,
  value,
  onChange,
  className,
}: FilterChipBarProps) {
  const tabs: TabItem[] = filters.map((f) => ({
    value: f.value,
    label: f.label,
    count: f.count,
  }));

  return (
    <div className={cn("w-full", className)}>
      <Tabs tabs={tabs} value={value} onChange={onChange} />
    </div>
  );
}
