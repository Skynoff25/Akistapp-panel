// api/create-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminDb } from "../../src/lib/firebase-admin"; // Asegúrate de importar adminDb
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";

const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Esquema actualizado para recibir los datos completos del dashboard
const createUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']),
  storeId: z.string().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!adminAuth || !adminDb) return res.status(500).json({ error: "Error del servidor" });
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  // 1. Rate Limiting
  try {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "") as string;
    await rateLimiter.consume(ip);
  } catch {
    return res.status(429).json({ error: "Demasiadas solicitudes" });
  }

  // 2. Verificación de Token (Seguridad)
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Falta token de autorización" });
  }
  
  try {
    const idToken = authHeader.slice("Bearer ".length);
    const decoded = await adminAuth.verifyIdToken(idToken);
    
    // Solo admins o managers pueden crear usuarios (ajusta según tu lógica)
    if (!['admin', 'store_manager', 'company'].includes(decoded.rol || decoded.type || '')) {
       // Nota: he añadido 'rol' para compatibilidad con tu nuevo esquema
       return res.status(403).json({ error: "Permisos insuficientes" });
    }
  } catch (e) {
    console.error(e)
    return res.status(401).json({ error: "Token inválido" });
  }

  // 3. Validación de datos
  const parsed = createUserRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
  }
  
  const { email, password, name, rol, storeId } = parsed.data;

  try {
    // 4. Crear usuario en Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true 
    });

    // 5. Asignar Custom Claims (Roles)
    await adminAuth.setCustomUserClaims(userRecord.uid, { 
      rol, 
      storeId: storeId || null,
      type: rol === 'admin' ? 'admin' : 'employee' // Manteniendo compatibilidad con tu sistema anterior
    });

    // 6. Crear documento en Firestore (Movido desde el frontend/action hacia aquí)
    if (adminDb) {
      await adminDb.collection('Users').doc(userRecord.uid).set({
        name,
        email,
        rol,
        storeId: storeId || null,
        createdAt: Date.now(),
        photoUrl: null,
        cityName: 'default',
        updatedAt: Date.now()
      });
    }

    return res.status(200).json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error("Error backend create-user:", error);
    // Si falla Firestore, idealmente deberíamos borrar el usuario de Auth (rollback manual), 
    // pero por simplicidad retornamos error.
    return res.status(500).json({ error: error.message || "Error interno al crear usuario" });
  }
}