// api/get-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminDb } from "../../src/lib/firebase-admin";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";

const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

const getUserSchema = z.object({
  uid: z.string().min(1, { message: "ID inválido" }).trim(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!adminAuth || !adminDb) return res.status(500).json({ error: "Error del servidor" });
  // 1. Mantenimiento y Rate Limiting
  const maintenance = (process.env.MODE_MAINTENANCE || "false").toLowerCase() === "true";
  if (maintenance) {
    return res.status(503).json({ error: "El servicio está en mantenimiento. Intenta más tarde." });
  }

  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string;
  try {
    await rateLimiter.consume(ip);
  } catch {
    return res.status(429).json({ error: "Demasiadas solicitudes, intenta de nuevo más tarde." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." });
  }

  // 2. Verificación de Token
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Falta token de autorización." });
  }
  
  const idToken = authHeader.slice("Bearer ".length);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }

  // 3. Validación de Roles del solicitante
  // Ajustado a los nuevos roles (admin, store_manager) y a los antiguos por compatibilidad
  const requesterRol = decoded.rol || decoded.type;
  if (!["admin", "store_manager", "company", "employee"].includes(requesterRol)) {
    return res.status(403).json({ error: "No tienes permisos para acceder." });
  }

  // 4. Validación del Body
  const parsed = getUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "ID inválido." });
  }
  const { uid } = parsed.data;

  try {
    // 5. Obtener datos de Firestore (Si existe el documento)
    let firestoreData = null;
    if (adminDb) {
      const userDoc = await adminDb.collection('Users').doc(uid).get();
      if (userDoc.exists) {
        firestoreData = userDoc.data();
      }
    }

    // 6. Obtener datos de Auth
    const userRecord = await adminAuth.getUser(uid);
    const claims = userRecord.customClaims || {};

    // Opcional: Validar si un store_manager intenta ver a alguien que no es de su tienda
    if (requesterRol === "store_manager") {
      const targetStoreId = claims.storeId || (firestoreData && firestoreData.storeId);
      if (targetStoreId !== decoded.storeId) {
        return res.status(403).json({ error: "No puedes ver usuarios de otra tienda." });
      }
    }

    // Retornamos un objeto unificado
    return res.status(200).json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      disabled: userRecord.disabled,
      claims,
      profile: firestoreData // Aquí va toda la data guardada en la BD (nombre, ciudad, etc)
    });

  } catch (err: any) {
    console.error("Error al obtener datos de la cuenta:", err);
    if (err.code === "auth/user-not-found") {
      return res.status(404).json({ error: "El usuario no existe." });
    } else {
      return res.status(500).json({ error: "Error interno del servidor: " + err.message });
    }
  }
}