"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";

type State = "loading" | "success" | "already_confirmed" | "expired" | "not_found" | "error";

const STATES: Record<
  State,
  { icon: React.ReactNode; title: string; desc: string; color: string; border: string }
> = {
  loading: {
    icon: <Loader2 className="h-12 w-12 animate-spin" style={{ color: "#a5b4fc" }} />,
    title: "Verificando tu solicitud…",
    desc: "Por favor espera un momento.",
    color: "rgba(99,102,241,0.15)",
    border: "rgba(99,102,241,0.3)",
  },
  success: {
    icon: <CheckCircle className="h-12 w-12" style={{ color: "#4ade80" }} />,
    title: "Solicitud confirmada",
    desc: "Tu solicitud de eliminación de cuenta ha sido verificada y registrada correctamente. Tu cuenta y todos tus datos personales serán eliminados en un plazo máximo de 30 días hábiles. Recibirás una notificación por email cuando el proceso finalice.",
    color: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
  },
  already_confirmed: {
    icon: <CheckCircle className="h-12 w-12" style={{ color: "#4ade80" }} />,
    title: "Ya confirmado",
    desc: "Esta solicitud ya fue confirmada previamente. Tu cuenta se eliminará en un máximo de 30 días hábiles.",
    color: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
  },
  expired: {
    icon: <Clock className="h-12 w-12" style={{ color: "#fbbf24" }} />,
    title: "Enlace expirado",
    desc: "El enlace de confirmación ha expirado (tiene una validez de 24 horas). Por favor envía una nueva solicitud de eliminación.",
    color: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
  },
  not_found: {
    icon: <XCircle className="h-12 w-12" style={{ color: "#f87171" }} />,
    title: "Enlace no válido",
    desc: "El enlace que usaste no es válido o ya fue procesado. Si crees que es un error, escríbenos a soporte@akistapp.com.",
    color: "rgba(220,38,38,0.12)",
    border: "rgba(220,38,38,0.3)",
  },
  error: {
    icon: <XCircle className="h-12 w-12" style={{ color: "#f87171" }} />,
    title: "Error inesperado",
    desc: "Ocurrió un problema al procesar tu solicitud. Por favor inténtalo de nuevo o contáctanos en soporte@akistapp.com.",
    color: "rgba(220,38,38,0.12)",
    border: "rgba(220,38,38,0.3)",
  },
};

export default function ConfirmDeletionContent() {
  // useSearchParams() is safe here because this component is always
  // rendered inside a <Suspense> boundary in page.tsx
  const params = useSearchParams();
  const token = params?.get("token");
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      setState("not_found");
      return;
    }

    fetch(`/api/confirm-deletion?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.success) {
          setState(body.message === "ALREADY_CONFIRMED" ? "already_confirmed" : "success");
        } else if (body.error === "TOKEN_EXPIRED") {
          setState("expired");
        } else if (body.error === "TOKEN_NOT_FOUND") {
          setState("not_found");
        } else {
          setState("error");
        }
      })
      .catch(() => setState("error"));
  }, [token]);

  const current = STATES[state];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)" }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 mb-12 text-white font-bold text-xl opacity-80 hover:opacity-100 transition-opacity"
      >
        <ShoppingBag className="h-6 w-6" />
        AkistApp
      </Link>

      {/* Card */}
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
            background: current.color,
            border: `1px solid ${current.border}`,
          }}
        >
          {current.icon}
        </div>

        <h1 className="text-2xl font-bold text-white mb-4">{current.title}</h1>
        <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
          {current.desc}
        </p>

        {(state === "expired" || state === "not_found" || state === "error") && (
          <Link
            href="/legal/delete-account"
            className="inline-block mt-8 px-6 py-3 rounded-xl font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
          >
            Nueva solicitud
          </Link>
        )}

        {state === "success" && (
          <div
            className="mt-8 rounded-xl p-4 text-sm text-left"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <p className="font-medium mb-1" style={{ color: "#4ade80" }}>
              ¿Cambias de opinión?
            </p>
            <p style={{ color: "#94a3b8" }}>
              Puedes cancelar esta solicitud escribiéndonos a{" "}
              <a
                href="mailto:soporte@akistapp.com"
                className="underline"
                style={{ color: "#60a5fa" }}
              >
                soporte@akistapp.com
              </a>{" "}
              antes de que se procese la eliminación.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs mt-8" style={{ color: "#334155" }}>
        © {new Date().getFullYear()} AkistApp — Skynoff Technologies
      </p>
    </div>
  );
}
