// src/app/dashboard/users/actions.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Esquema base coincidente con tu formulario
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

// Helper para obtener la URL base y el token
async function getAuthHeaders() {
  const cookieStore = await cookies();
  // Asumimos que guardas el token en una cookie llamada 'token' o 'session'
  const token = cookieStore.get('token')?.value || ''; 
  
  // Si no hay token en cookies, esto fallará en la API con 401.
  // Asegúrate de que tu middleware o login setee esta cookie.
  
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_HOST || 'localhost:9002';
  const baseUrl = `${protocol}://${host}`;

  return {
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  };
}

export async function createUser(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = createUserSchema.safeParse(values);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const { baseUrl, headers } = await getAuthHeaders();
    
    // Llamada a tu API Backend
    const res = await fetch(`${baseUrl}/api/create-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify(validatedFields.data),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al crear usuario en el servidor');
    }

    revalidatePath('/dashboard/users');
    return { message: `Usuario creado correctamente.` };

  } catch (error: any) {
    console.error("Error en action createUser:", error);
    return { errors: { _form: [error.message] } };
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
    const { baseUrl, headers } = await getAuthHeaders();

    const res = await fetch(`${baseUrl}/api/update-user`, {
      method: 'POST', // Usamos POST como en tu archivo original, aunque PUT sería más semántico
      headers,
      body: JSON.stringify({
        uid: validatedFields.data.id,
        data: validatedFields.data
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Error al actualizar usuario');
    }

    revalidatePath('/dashboard/users');
    return { message: `Usuario actualizado correctamente.` };

  } catch (error: any) {
    return { errors: { _form: [error.message] } };
  }
}

export async function deleteUser(userId: string) {
  try {
    const { baseUrl, headers } = await getAuthHeaders();

    const res = await fetch(`${baseUrl}/api/delete-user`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ uid: userId }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Error al eliminar usuario');
    }

    revalidatePath('/dashboard/users');
    return { message: "Usuario eliminado correctamente." };
  } catch (error: any) {
    return { error: error.message };
  }
}