'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']),
  storeId: z.string().optional(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine((data) => {
    if ((data.rol === 'store_manager' || data.rol === 'store_employee') && !data.storeId) {
        return false;
    }
    return true;
}, {
    message: "Se debe seleccionar una tienda para este rol.",
    path: ["storeId"],
});

const updateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']),
  storeId: z.string().optional(),
  id: z.string().min(1),
  password: z.string().optional(),
}).refine((data) => {
    if ((data.rol === 'store_manager' || data.rol === 'store_employee') && !data.storeId) {
        return false;
    }
    return true;
}, {
    message: "Se debe seleccionar una tienda para este rol.",
    path: ["storeId"],
});

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value; 

  if (!token) {
    throw new Error("Sesión expirada o token no encontrado. Por favor, recarga la página.");
  }
  
  if (!adminAuth || !adminDb) {
      throw new Error("Firebase Admin no inicializado en el servidor.");
  }

  try {
      const decoded = await adminAuth.verifyIdToken(token);
      return decoded;
  } catch (error: any) {
      console.error("[verifyAdmin error]:", error);
      throw new Error(`Error de autenticación: ${error.message || "Token inválido"}. Por favor, recarga y reintenta.`);
  }
}

export async function createUser(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = createUserSchema.safeParse(values);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await verifyAdmin();

    const data = validatedFields.data;

    // 1. Create User in Firebase Auth
    const userRecord = await adminAuth!.createUser({
        email: data.email,
        password: data.password,
        displayName: data.name,
    });

    // 2. Add custom claims for role (optional but good practice)
    await adminAuth!.setCustomUserClaims(userRecord.uid, {
        role: data.rol,
        storeId: data.storeId || null
    });

    // 3. Create User Document in Firestore
    const now = Date.now();
    await adminDb!.collection('Users').doc(userRecord.uid).set({
        id: userRecord.uid,
        email: data.email,
        name: data.name,
        displayName: data.name,
        rol: data.rol,
        storeId: data.storeId || null,
        createdAt: now,
        isBlocked: false,
        favoriteStoreIds: [],
        fcmTokens: [],
        cityId: 'not-set',
        cityName: 'not-set'
    });

    revalidatePath('/dashboard/users');
    return { message: `Usuario creado correctamente.` };

  } catch (error: any) {
    console.error("Error en action createUser:", error);
    // If it's a Firebase Error like email already in use
    if (error.code === 'auth/email-already-exists') {
        return { errors: { _form: ['El email ya está registrado.'] } };
    }
    return { errors: { _form: [error.message || 'Error inesperado'] } };
  }
}

export async function updateUser(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  if (values.password === '') delete values.password;

  const validatedFields = updateUserSchema.safeParse(values);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await verifyAdmin();

    const data = validatedFields.data;
    const uid = data.id;

    // 1. Update Auth Profile
    const updateData: any = {};
    if (data.password) updateData.password = data.password;
    if (data.email) updateData.email = data.email;
    if (data.name) updateData.displayName = data.name;

    if (Object.keys(updateData).length > 0) {
        await adminAuth!.updateUser(uid, updateData);
    }
    
    // Update custom claims
    await adminAuth!.setCustomUserClaims(uid, {
        role: data.rol,
        storeId: data.storeId || null
    });

    // 2. Update Firestore Document
    const firestoreUpdate: any = {
        name: data.name,
        displayName: data.name,
        rol: data.rol,
        storeId: data.storeId || null
    };
    if (data.email) firestoreUpdate.email = data.email;

    await adminDb!.collection('Users').doc(uid).update(firestoreUpdate);

    revalidatePath('/dashboard/users');
    return { message: `Usuario actualizado correctamente.` };

  } catch (error: any) {
    console.error("Error en action updateUser:", error);
    if (error.code === 'auth/email-already-exists') {
        return { errors: { _form: ['El email ya está registrado con otro usuario.'] } };
    }
    return { errors: { _form: [error.message || 'Error inesperado al actualizar usuario'] } };
  }
}

export async function toggleBlockUser(userId: string, isBlocked: boolean, reason?: string) {
  try {
    await verifyAdmin();

    await adminAuth!.updateUser(userId, { disabled: isBlocked });
    
    await adminDb!.collection('Users').doc(userId).update({
        isBlocked: isBlocked,
        blockedReason: isBlocked ? (reason || 'No especificado') : null
    });

    revalidatePath('/dashboard/users');
    return { message: `Usuario ${isBlocked ? 'bloqueado' : 'desbloqueado'} correctamente.` };
  } catch (error: any) {
    console.error("Error en action toggleBlockUser:", error);
    return { error: error.message || 'Error al cambiar estado de bloqueo' };
  }
}

export async function deleteUser(userId: string) {
  try {
    await verifyAdmin();

    await adminAuth!.deleteUser(userId);
    await adminDb!.collection('Users').doc(userId).delete();

    revalidatePath('/dashboard/users');
    return { message: "Usuario eliminado correctamente." };
  } catch (error: any) {
    console.error("Error en action deleteUser:", error);
    return { error: error.message || 'Error al eliminar usuario' };
  }
}
