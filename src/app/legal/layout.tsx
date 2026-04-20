import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
            <ShoppingBag className="h-6 w-6" />
            AkistApp
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/legal/privacy-policy" className="hover:text-foreground transition-colors">Privacidad</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Términos</Link>
            <Link href="/legal/help" className="hover:text-foreground transition-colors">Ayuda</Link>
            <Link href="/legal/delete-account" className="hover:text-red-600 text-red-500 transition-colors">Eliminar cuenta</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AkistApp. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/legal/privacy-policy" className="hover:text-foreground transition-colors">Política de Privacidad</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Términos de Uso</Link>
            <Link href="/legal/help" className="hover:text-foreground transition-colors">Ayuda</Link>
            <Link href="/legal/delete-account" className="hover:text-red-600 text-red-500 transition-colors">Eliminar cuenta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
