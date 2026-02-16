// api/delete-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminDb } from "../../src/lib/firebase-admin";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";

const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

const deleteUserSchema = z.object({
  uid: z.string().min(1, "El ID del usuario es requerido"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!adminAuth || !adminDb) return res.status(500).json({ error: "Error del servidor" });  
  if (req.method !== "DELETE") return res.status(405).json({ error: "Método no permitido" });

  // 1. Rate Limiting
  try {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "") as string;
    await rateLimiter.consume(ip);
  } catch {
    return res.status(429).json({ error: "Demasiadas solicitudes" });
  }

  // 2. Verificación de Token (Seguridad y Permisos)
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Falta token de autorización" });
  }
  
  try {
    const idToken = authHeader.slice("Bearer ".length);
    const decoded = await adminAuth.verifyIdToken(idToken);
    
    // Solo admins o managers pueden eliminar usuarios
    if (!['admin', 'store_manager', 'company'].includes(decoded.rol || decoded.type || '')) {
       return res.status(403).json({ error: "Permisos insuficientes para eliminar usuarios" });
    }
  } catch (e) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  // 3. Validación de datos del Body
  const parsed = deleteUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "ID inválido", details: parsed.error.flatten() });
  }
  
  const { uid } = parsed.data;

  try {
    // 4. Eliminar de Auth
    await adminAuth.deleteUser(uid);

    // 5. Eliminar de Firestore
    if (adminDb) {
      await adminDb.collection('Users').doc(uid).delete();
    }

    return res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    return res.status(500).json({ error: err.message || "Error interno al eliminar usuario" });
  }
}