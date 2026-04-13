import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FloatingCTA({ showFloatingCTA }: { showFloatingCTA: boolean }) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden z-100 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${showFloatingCTA ? 'translate-y-0' : 'translate-y-[150%]'}`}>
      <Link
        href="/signup"
        className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm shadow-2xl shadow-gray-900/30 active:scale-[0.98] active:bg-teal-600 transition-all duration-200"
      >
        Créer ma page gratuitement
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
