"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowDownRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { WithdrawalHistory } from "./_WithdrawalHistory";

interface RetraitsTabsProps {
  /** The AmountStep form (or any content for the "new withdrawal" tab) */
  children: React.ReactNode;
}

const TABS = [
  { id: "nouveau", label: "Nouveau retrait", icon: Plus },
  { id: "historique", label: "Historique", icon: ArrowDownRight },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function RetraitsTabs({ children }: RetraitsTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "historique" ? "historique" : "nouveau";
  const [activeTab, setActiveTab] = React.useState<TabId>(initialTab);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    // Update URL without full reload
    const url = new URL(window.location.href);
    if (tab === "nouveau") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="mx-auto mb-6 flex max-w-2xl gap-1 rounded-2xl bg-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                isActive
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-primary",
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "nouveau" ? (
        children
      ) : (
        <div className="mx-auto max-w-2xl">
          <WithdrawalHistory />
        </div>
      )}
    </div>
  );
}
