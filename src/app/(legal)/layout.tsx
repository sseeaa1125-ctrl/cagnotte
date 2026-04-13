import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 selection:bg-teal-200 selection:text-teal-900 font-sans">
      {/* Navbar Minimal */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-sm sm:text-base font-bold text-gray-600 tracking-tight flex items-center gap-1.5 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} />
            Retour à l&apos;accueil
          </Link>
          <Link href="/" className="shrink-0 flex items-center">
            <Image 
              src="/logo/1x/Logo Izy.store.png" 
              alt="Izy.store" 
              width={100} 
              height={30} 
              className="w-[80px] sm:w-[100px] h-auto object-contain"
            />
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <article className="prose prose-teal prose-lg max-w-none text-gray-600 font-medium leading-relaxed prose-headings:font-extrabold prose-headings:text-gray-900 prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-2xl sm:prose-h2:text-3xl prose-a:font-bold prose-a:text-teal-600 hover:prose-a:text-teal-500">
          {children}
        </article>
      </main>
      
      {/* Simple Footer */}
      <footer className="bg-gray-900 py-12 text-center">
        <div className="mx-auto max-w-3xl px-4 flex flex-col items-center gap-4">
          <Link href="/" className="shrink-0 flex items-center mb-2">
            <Image 
              src="/logo/1x/Logo Izy.store texte blanc.png" 
              alt="Izy.store" 
              width={120} 
              height={36} 
              className="w-[100px] sm:w-[120px] h-auto object-contain"
            />
          </Link>
          <div className="flex gap-4 sm:gap-6 text-sm text-gray-400 font-medium">
            <Link href="/cgv" className="hover:text-white transition-colors">CGV</Link>
            <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions Légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
