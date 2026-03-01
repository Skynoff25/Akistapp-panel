
// api/create-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminDb } from "../../src/lib/firebase-admin"; 
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";

const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

const createUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']),
  storeId: z.string().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!adminAuth || !adminDb) return res.status(500).json({ error: "Servicio de administración no disponible" });
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  // 1. Rate Limiting
  try {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "") as string;
    await rateLimiter.consume(ip);
  } catch {
    return res.status(429).json({ error: "Demasiadas solicitudes" });
  }

  // 2. Verificación de Token
  const authHeader = req.headers.authorization || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Falta token de autorización" });
  }
  
  try {
    const idToken = authHeader.split(" ")[1];
    if (!idToken) throw new Error("Token vacío");
    
    const decoded = await adminAuth.verifyIdToken(idToken);
    
    const requesterRol = decoded.rol || decoded.type || '';
    if (!['admin', 'store_manager', 'company'].includes(requesterRol)) {
       return res.status(403).json({ error: "Permisos insuficientes" });
    }
  } catch (e) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  // 3. Validación de datos
  const parsed = createUserRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
  }
  
  const { email, password, name, rol, storeId } = parsed.data;

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true 
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { 
      rol, 
      storeId: storeId || null,
      type: rol === 'admin' ? 'admin' : 'employee'
    });

    if (adminDb) {
      await adminDb.collection('Users').doc(userRecord.uid).set({
        name,
        email,
        rol,
        storeId: storeId || null,
        createdAt: Date.now(),
        photoUrl: null,
        cityName: 'default',
        updatedAt: Date.now(),
        emailVerified: true,
        isBlocked: false
      });
    }

    return res.status(200).json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error("Error backend create-user:", error);
    return res.status(500).json({ error: error.message || "Error interno al crear usuario" });
  }
}
