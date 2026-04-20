"use client";

import type { Metadata } from "next";
import { useState } from "react";
import {
  Trash2,
  Mail,
  AlertTriangle,
  CheckCircle,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

const REASONS = [
  "Ya no uso la aplicación",
  "Tengo preocupaciones sobre mi privacidad",
  "Quiero eliminar mis datos personales",
  "Tengo una cuenta duplicada",
  "Otro motivo",
];

const STEPS = [
  {
    icon: Mail,
    title: "Envía tu solicitud",
    desc: "Ingresa el email de tu cuenta y recibirás un enlace de confirmación.",
  },
  {
    icon: Shield,
    title: "Confirma tu identidad",
    desc: "Haz clic en el enlace que te enviaremos al email para verificar que eres el titular.",
  },
  {
    icon: Clock,
    title: "Procesamos la eliminación",
    desc: "Tu cuenta y datos serán eliminados en un plazo máximo de 30 días hábiles.",
  },
];

export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: "¿Qué datos se eliminan?",
      a: "Se eliminan tu nombre, correo electrónico, teléfono, historial de pedidos e información de perfil. Los registros de transacciones completadas pueden conservarse en forma anonimizada por requisitos legales.",
    },
    {
      q: "¿Cuánto tiempo tarda el proceso?",
      a: "Una vez confirmada tu solicitud, el proceso de eliminación se completa en un máximo de 30 días hábiles. Recibirás una notificación cuando finalice.",
    },
    {
      q: "¿Puedo cancelar la solicitud?",
      a: "Sí, puedes cancelar la solicitud escribiéndonos a soporte@akistapp.com antes de que la eliminación sea procesada.",
    },
    {
      q: "¿Por qué necesito confirmar por email?",
      a: "La confirmación por email es un paso de seguridad para verificar que eres el/la titular legítimo/a de la cuenta y prevenir eliminaciones no autorizadas.",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;

    setLoading(true);
    setStatus("idle");
    setErrorMsg("");

    const finalReason = reason === "Otro motivo" ? customReason : reason;

    try {
      const res = await fetch("/api/request-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason: finalReason }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const body = await res.json();
        if (body.error === "INVALID_EMAIL") {
          setErrorMsg("El correo electrónico ingresado no es válido.");
        } else if (body.error === "TOO_MANY_REQUESTS") {
          setErrorMsg("Demasiados intentos. Espera un momento e inténtalo de nuevo.");
        } else {
          setErrorMsg("Ocurrió un error inesperado. Por favor intenta más tarde.");
        }
        setStatus("error");
      }
    } catch {
      setErrorMsg("No se pudo conectar. Verifica tu conexión e inténtalo de nuevo.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)" }}>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden py-20 px-4">
        {/* decorative blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(220,38,38,0.18) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
            style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}
          >
            <Trash2 className="h-10 w-10" style={{ color: "#f87171" }} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Eliminar mi cuenta
          </h1>
          <p className="text-lg" style={{ color: "#94a3b8" }}>
            Puedes solicitar la eliminación permanente de tu cuenta y todos tus datos en AkistApp.
            El proceso es seguro, gratuito y no requiere que inicies sesión.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ background: "transparent" }}
        >
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                  style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#a5b4fc" }} />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "#6366f1" }}>
                  Paso {i + 1}
                </p>
                <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                <p className="text-sm" style={{ color: "#94a3b8" }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FORM / SUCCESS ── */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        {status === "success" ? (
          <div
            className="rounded-3xl p-10 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 mx-auto"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <CheckCircle className="h-10 w-10" style={{ color: "#4ade80" }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Solicitud enviada</h2>
            <p className="mb-2" style={{ color: "#94a3b8" }}>
              Enviamos un correo de confirmación a{" "}
              <span className="text-white font-medium">{email}</span>.
            </p>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Haz clic en el enlace del correo para verificar tu identidad y activar la
              solicitud. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam.
            </p>
            <div
              className="mt-8 rounded-xl p-4 text-sm text-left"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <p className="font-medium mb-1" style={{ color: "#fbbf24" }}>
                ⚠️ El enlace expira en 24 horas
              </p>
              <p style={{ color: "#94a3b8" }}>
                Si no confirmas antes de ese plazo, deberás enviar una nueva solicitud. ¿Tienes
                dudas? Escríbenos a{" "}
                <a
                  href="mailto:soporte@akistapp.com"
                  className="underline"
                  style={{ color: "#60a5fa" }}
                >
                  soporte@akistapp.com
                </a>
                .
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl p-8 md:p-10"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Formulario de solicitud</h2>

            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="deletion-email"
                className="block text-sm font-medium mb-2"
                style={{ color: "#cbd5e1" }}
              >
                Correo electrónico de tu cuenta *
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "#64748b" }}
                />
                <input
                  id="deletion-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(99,102,241,0.6)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "#64748b" }}>
                Debe ser el mismo email con el que creaste tu cuenta en AkistApp.
              </p>
            </div>

            {/* Reason */}
            <div className="mb-5">
              <label
                htmlFor="deletion-reason"
                className="block text-sm font-medium mb-2"
                style={{ color: "#cbd5e1" }}
              >
                Motivo de la solicitud (opcional)
              </label>
              <select
                id="deletion-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all appearance-none cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: reason ? "#fff" : "#64748b",
                }}
              >
                <option value="" style={{ background: "#1e293b" }}>
                  Selecciona un motivo…
                </option>
                {REASONS.map((r) => (
                  <option key={r} value={r} style={{ background: "#1e293b" }}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {reason === "Otro motivo" && (
              <div className="mb-5">
                <label
                  htmlFor="custom-reason"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#cbd5e1" }}
                >
                  Cuéntanos más (opcional)
                </label>
                <textarea
                  id="custom-reason"
                  rows={3}
                  maxLength={500}
                  placeholder="Escribe aquí tu motivo…"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none resize-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
              </div>
            )}

            {/* Warning box */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#f87171" }} />
                <div className="text-sm" style={{ color: "#fca5a5" }}>
                  <p className="font-semibold mb-1">Esta acción es permanente</p>
                  <ul className="space-y-0.5" style={{ color: "#fca5a5", opacity: 0.85 }}>
                    <li>• Se eliminará tu cuenta y todos tus datos personales.</li>
                    <li>• Perderás el historial de pedidos y cupones activos.</li>
                    <li>• No podrás recuperar tu cuenta una vez eliminada.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Agree checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mb-7 select-none">
              <input
                id="deletion-agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-500 cursor-pointer"
              />
              <span className="text-sm" style={{ color: "#94a3b8" }}>
                Entiendo que esta acción es permanente e irreversible y deseo proceder con la
                solicitud de eliminación de mi cuenta y todos mis datos en AkistApp.
              </span>
            </label>

            {/* Error */}
            {status === "error" && (
              <div
                className="rounded-xl p-3 mb-5 text-sm"
                style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", color: "#f87171" }}
              >
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !agreed || !email}
              className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: agreed && email && !loading
                  ? "linear-gradient(135deg,#dc2626,#991b1b)"
                  : "rgba(220,38,38,0.3)",
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Enviando solicitud…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Solicitar eliminación de mi cuenta
                </>
              )}
            </button>

            <p className="text-center text-xs mt-4" style={{ color: "#475569" }}>
              Te enviaremos un correo de confirmación. El enlace expirará en 24 horas.
            </p>
          </form>
        )}

        {/* ── DATA TABLE ── */}
        <div
          className="mt-8 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <FileText className="h-4 w-4" style={{ color: "#94a3b8" }} />
            <h3 className="text-sm font-semibold text-white">¿Qué datos se eliminan?</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {[
              ["Nombre y apellido", "Eliminado"],
              ["Correo electrónico", "Eliminado"],
              ["Número de teléfono", "Eliminado"],
              ["Foto de perfil", "Eliminada"],
              ["Historial de pedidos", "Anonimizado (requisito legal)"],
              ["Cupones activos", "Eliminados"],
              ["Datos de ubicación", "Eliminados"],
            ].map(([campo, accion]) => (
              <div key={campo} className="flex items-center justify-between px-6 py-3">
                <span className="text-sm" style={{ color: "#94a3b8" }}>{campo}</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={
                    accion === "Eliminado" || accion === "Eliminados" || accion === "Eliminada"
                      ? { background: "rgba(220,38,38,0.15)", color: "#f87171" }
                      : { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }
                  }
                >
                  {accion}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-white mb-4">Preguntas frecuentes</h3>
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <button
                type="button"
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span className="text-sm font-medium text-white">{faq.q}</span>
                {faqOpen === i ? (
                  <ChevronUp className="h-4 w-4 shrink-0" style={{ color: "#64748b" }} />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "#64748b" }} />
                )}
              </button>
              {faqOpen === i && (
                <div
                  className="px-5 pb-4 text-sm"
                  style={{ color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="pt-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Contact ── */}
        <p className="text-center text-sm mt-10" style={{ color: "#475569" }}>
          ¿Necesitas ayuda?{" "}
          <a
            href="mailto:soporte@akistapp.com"
            className="underline transition-colors"
            style={{ color: "#60a5fa" }}
          >
            soporte@akistapp.com
          </a>
        </p>
      </section>
    </div>
  );
}
