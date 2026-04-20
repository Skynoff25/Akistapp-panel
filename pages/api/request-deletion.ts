import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "soporte@akistapp.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://panel.akistapp.com";

// ─── Simple rate-limit (in-memory, resets on cold start) ─────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 3) return true;
  entry.count++;
  return false;
}

// ─── Send email via a simple SMTP relay ──────────────────────────────────────
async function sendConfirmationEmail(to: string, confirmUrl: string) {
  // We use the Resend API (free tier). Set RESEND_API_KEY in env vars.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `AkistApp <no-reply@akistapp.com>`,
      to: [to],
      subject: "Confirma tu solicitud de eliminación de cuenta",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px;">AkistApp</h1>
            <p style="color:#64748b;font-size:14px;margin:0;">Solicitud de eliminación de cuenta</p>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="color:#991b1b;font-size:15px;margin:0;line-height:1.6;">
              Hemos recibido una solicitud para <strong>eliminar permanentemente</strong> tu cuenta y todos los datos asociados en AkistApp.
            </p>
          </div>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Para confirmar que eres el/la titular de esta cuenta, haz clic en el botón de abajo. Si <strong>no solicitaste</strong> la eliminación, simplemente ignora este correo.
          </p>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${confirmUrl}"
               style="display:inline-block;background:#dc2626;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
              Confirmar eliminación de mi cuenta
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 8px;">
            Este enlace expira en <strong>24 horas</strong>. Tras la confirmación, tu cuenta será eliminada en un plazo máximo de 30 días hábiles.
          </p>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
            Si tienes dudas, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;">${SUPPORT_EMAIL}</a>.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="color:#d1d5db;font-size:12px;text-align:center;margin:0;">
            © ${new Date().getFullYear()} AkistApp — Skynoff Technologies
          </p>
        </div>
      `,
    }),
  });
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "TOO_MANY_REQUESTS" });
  }

  if (!adminDb) {
    return res.status(500).json({ error: "DB_NOT_INITIALIZED" });
  }

  const { email, reason } = req.body as { email?: string; reason?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "INVALID_EMAIL" });
  }

  // Check for recent (< 24 h) pending request for the same email
  const existingSnap = await adminDb
    .collection("account_deletion_requests")
    .where("email", "==", email.toLowerCase().trim())
    .where("status", "==", "pending_confirmation")
    .where("expiresAt", ">", new Date())
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    // Return success silently to avoid email enumeration
    return res.status(200).json({ success: true, message: "ALREADY_SENT" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

  const docRef = adminDb.collection("account_deletion_requests").doc();
  await docRef.set({
    id: docRef.id,
    email: email.toLowerCase().trim(),
    reason: reason?.trim().slice(0, 500) || null,
    token,
    status: "pending_confirmation",
    createdAt: new Date(),
    expiresAt,
    confirmedAt: null,
    processedAt: null,
    ipAddress: ip,
  });

  const confirmUrl = `${APP_URL}/legal/delete-account/confirm?token=${token}`;

  try {
    await sendConfirmationEmail(email, confirmUrl);
  } catch (err) {
    console.error("Error sending confirmation email:", err);
    // Don't fail the request; the token is saved and support can handle it.
  }

  return res.status(200).json({ success: true });
}
