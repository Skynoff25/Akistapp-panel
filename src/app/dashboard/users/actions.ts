'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
// import { adminAuth, adminDb } from '@/lib/firebase-admin';
// import { doc, setDoc } from 'firebase-admin/firestore';

const userSchema = z.object({
  email: z.string().email('Dirección de correo electrónico inválida.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']),
  storeId: z.string().optional(),
}).refine((data) => {
    if ((data.rol === 'store_manager' || data.rol === 'store_employee') && !data.storeId) {
        return false;
    }
    return true;
}, {
    message: "Se debe seleccionar una tienda para este rol.",
    path: ["storeId"],
});


export async function createUser(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = userSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // --- SIMULATION MODE ---
  // The Firebase Admin SDK is required to create users, but it cannot be authenticated
  // in this environment. See /docs/backend.md for a full explanation.
  // We will simulate the user creation process.
  const { email, password, name, rol, storeId } = validatedFields.data;

  try {
    console.log(`[SIMULATION] Attempting to create user: ${email}`);
    
    // In a real implementation, this is where you would use the Admin SDK:
    /*
    if (!adminAuth || !adminDb) {
      throw new Error("El SDK de Administrador de Firebase no está inicializado.");
    }

    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: name,
    });
    
    await adminAuth.setCustomUserClaims(userRecord.uid, { rol, storeId: storeId || null });
    
    const userDocRef = adminDb.collection('Users').doc(userRecord.uid);
    await setDoc(userDocRef, {
        name: name,
        email: email,
        rol: rol,
        storeId: storeId || null,
        createdAt: Date.now(),
        // Default fields
        photoUrl: null,
        cityId: 'default',
        cityName: 'default',
        favoriteStoreIds: [],
        emailVerified: false,
        isPhoneVerified: false,
        isIdentityVerified: false,
        rating: 0,
        ratingCount: 0,
        isBlocked: false,
        fcmTokens: [],
    });
    */

    console.log(`[SIMULATION] User ${email} created successfully with UID (simulated).`);
    revalidatePath('/dashboard/users');
    return { message: `Usuario ${name} creado exitosamente (Simulación).` };

  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    // This will now return the specific Firebase error to the form.
    return { errors: { _form: [error.message] } };
  }
}
