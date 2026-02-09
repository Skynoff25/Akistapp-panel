'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

const userSchema = z.object({
  email: z.string().email('Dirección de correo electrónico inválida.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']),
  storeId: z.string().optional(),
});

export async function createUser(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = userSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, name, rol, storeId } = validatedFields.data;

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false, 
    });
    
    await adminDb.collection('Users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name,
        displayName: name,
        rol,
        storeId: storeId || null,
        createdAt: Date.now(),
        photoUrl: null,
        cityId: "",
        cityName: "",
        favoriteStoreIds: [],
        emailVerified: false,
        isPhoneVerified: false,
        isIdentityVerified: false,
        rating: 0,
        ratingCount: 0,
        isBlocked: false,
        fcmTokens: [],
    });

    revalidatePath("/dashboard/users");
    return { message: "Usuario creado exitosamente." };

  } catch (e: any) {
    console.error(e);
    let errorMessage = 'No se pudo crear el usuario.';
    if (e.code === 'auth/email-already-exists') {
        errorMessage = 'El correo electrónico ya está en uso por otra cuenta.';
    }
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
    };
  }
}
