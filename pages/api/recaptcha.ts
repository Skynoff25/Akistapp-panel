import type { NextApiRequest, NextApiResponse } from "next";

const SECRET_KEY = process.env.NEXT_PRIVATE_RECAPTCHA_SECRET_KEY!;

async function verifyToken(token: string) {
  const params = new URLSearchParams({
    secret: SECRET_KEY,
    response: token,
  });

  const gRes = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    }
  );

  return (await gRes.json()) as {
    success: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  const maintenance = (process.env.MODE_MAINTENANCE || "false").toLowerCase() === "true";
  if (maintenance) {
    return res
      .status(503)
      .json({ error: "El servicio está en mantenimiento. Intenta más tarde." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const { token, action } = req.body as {
    token?: string;
    action?: string;
  };

  if (!token) {
    return res.status(400).json({ error: "TOKEN_MISSING" });
  }

  try {
    const data = await verifyToken(token);

    if (!data.success) {
      return res.status(400).json({
        error: "CAPTCHA_FAILED",
        detail: data["error-codes"],
      });
    }

    if (data.score !== undefined) {
      if (data.score < 0.7 || (action && data.action !== action)) {
        return res.status(400).json({
          error: "CAPTCHA_LOW_SCORE",
          score: data.score,
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("reCAPTCHA error:", e);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}