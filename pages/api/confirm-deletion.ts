import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/lib/firebase-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "INVALID_TOKEN" });
  }

  if (!adminDb) {
    return res.status(500).json({ error: "DB_NOT_INITIALIZED" });
  }

  // Find the request by token
  const snap = await adminDb
    .collection("account_deletion_requests")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snap.empty) {
    return res.status(404).json({ error: "TOKEN_NOT_FOUND" });
  }

  const doc = snap.docs[0];
  const data = doc.data();

  if (data.status === "confirmed") {
    return res.status(200).json({ success: true, message: "ALREADY_CONFIRMED" });
  }

  if (data.status !== "pending_confirmation") {
    return res.status(400).json({ error: "INVALID_STATUS" });
  }

  // Check expiry
  const expiresAt: Date = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
  if (new Date() > expiresAt) {
    await doc.ref.update({ status: "expired" });
    return res.status(410).json({ error: "TOKEN_EXPIRED" });
  }

  // Confirm the request
  await doc.ref.update({
    status: "confirmed",
    confirmedAt: new Date(),
  });

  return res.status(200).json({ success: true });
}
