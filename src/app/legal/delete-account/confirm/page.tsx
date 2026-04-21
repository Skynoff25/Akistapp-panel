import { Suspense } from "react";
import ConfirmDeletionContent from "./ConfirmDeletionContent";
import { Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";

// Loading fallback shown during SSR / hydration
function ConfirmLoadingFallback() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)" }}
    >
      <Link
        href="/"
        className="flex items-center gap-2 mb-12 text-white font-bold text-xl opacity-80 hover:opacity-100 transition-opacity"
      >
        <ShoppingBag className="h-6 w-6" />
        AkistApp
      </Link>
      <div
        className="w-full max-w-md rounded-3xl p-10 text-center"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 mx-auto"
          style={{
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <Loader2 className="h-12 w-12 animate-spin" style={{ color: "#a5b4fc" }} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Verificando tu solicitud…</h1>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Por favor espera un momento.
        </p>
      </div>
    </div>
  );
}

// Next.js 15 App Router requires useSearchParams() to be inside a <Suspense> boundary
// so that the page can be statically prerendered without blocking the build.
export default function ConfirmDeletionPage() {
  return (
    <Suspense fallback={<ConfirmLoadingFallback />}>
      <ConfirmDeletionContent />
    </Suspense>
  );
}
