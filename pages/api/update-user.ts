// api/update-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminDb } from "../../src/lib/firebase-admin";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";

const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

const updateUserRequestSchema = z.object({
  uid: z.string().min(1),
  data: z.object({
    email: z.string().email().optional(),
    password: z.string().optional(),
    name: z.string().optional(),
    rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']).optional(),
    storeId: z.string().optional().nullable(),
  })
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

  // 2. Verificación de Token (Seguridad y Permisos)
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Falta token de autorización" });
  }
  
  try {
    const idToken = authHeader.slice("Bearer ".length);
    const decoded = await adminAuth.verifyIdToken(idToken);
    
    // Solo admins o managers pueden actualizar usuarios
    if (!['admin', 'store_manager', 'company'].includes(decoded.rol || decoded.type || '')) {
       return res.status(403).json({ error: "Permisos insuficientes para editar usuarios" });
    }
  } catch (e) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  // 3. Validación de datos del Body
  const parsed = updateUserRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
  }
  
  const { uid, data } = parsed.data;

  try {
    // 4. Actualizar Auth
    const updateAuthData: any = {};
    if (data.email) updateAuthData.email = data.email;
    if (data.password) updateAuthData.password = data.password;
    if (data.name) updateAuthData.displayName = data.name;

    if (Object.keys(updateAuthData).length > 0) {
      await adminAuth.updateUser(uid, updateAuthData);
    }

    // 5. Actualizar Claims si cambia el rol
    if (data.rol || data.storeId !== undefined) {
      // Necesitamos obtener los claims actuales para no borrar otros claims que el usuario pueda tener
      const user = await adminAuth.getUser(uid);
      const currentClaims = user.customClaims || {};
      
      await adminAuth.setCustomUserClaims(uid, {
        ...currentClaims,
        ...(data.rol ? { 
            rol: data.rol, 
            type: data.rol === 'admin' ? 'admin' : 'employee' 
        } : {}),
        ...(data.storeId !== undefined ? { storeId: data.storeId } : {}),
      });
    }

    // 6. Actualizar Firestore
    if (adminDb) {
      const firestoreUpdate: any = { updatedAt: Date.now() };
      if (data.name) firestoreUpdate.name = data.name;
      if (data.email) firestoreUpdate.email = data.email;
      if (data.rol) firestoreUpdate.rol = data.rol;
      if (data.storeId !== undefined) firestoreUpdate.storeId = data.storeId;

      await adminDb.collection('Users').doc(uid).update(firestoreUpdate);
    }

    return res.status(200).json({ success: true, uid });

  } catch (err: any) {
    console.error("Error updating user:", err);
    return res.status(500).json({ error: err.message || "Error interno al actualizar usuario" });
  }
}