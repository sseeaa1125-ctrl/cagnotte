import { X } from "lucide-react";
import { SIDEBAR_CATEGORIES } from "./constants";

interface PickerSidebarProps {
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  onClose: () => void;
}

export function PickerSidebar({ activeCategory, onCategoryChange, onClose }: PickerSidebarProps) {
  return (
    <div className="hidden sm:flex flex-col w-52 shrink-0 border-r border-gray-100 bg-gray-50/70">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <h2 className="text-base font-bold text-gray-900">Ajouter un bloc</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
          <X size={15} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-0.5">
        {SIDEBAR_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-white shadow-sm text-gray-900 border border-gray-100"
                : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
            }`}
          >
            <span className={`transition-colors ${activeCategory === cat.id ? "text-teal-600" : "text-gray-400"}`}>
              {cat.icon}
            </span>
            {cat.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
