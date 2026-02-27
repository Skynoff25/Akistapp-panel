// src/app/dashboard/users/actions.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// 1. DEFINIMOS LA URL BASE
// Lo ideal es usar una variable de entorno, pero por ahora usa la que SABES que funciona.
// Si tienes configurado un .env, usa: process.env.BACKEND_URL
const API_URL = process.env.BACKEND_URL || 'https://akistapp-backend--akistapp.us-east4.hosted.app';

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

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || ''; 

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Asegúrate que tu backend espera "Bearer"
  };
}

export async function createUser(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = createUserSchema.safeParse(values);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const headers = await getAuthHeaders();
    
    // 2. CORRECCIÓN AQUI: Usamos la URL absoluta
    console.log(`Intentando conectar a: ${API_URL}/api/create-user`); // Log para depurar

    const res = await fetch(`${API_URL}/api/create-user`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(validatedFields.data),
    });

    // Es importante leer el texto o json con cuidado
    const responseText = await res.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`El servidor devolvió algo que no es JSON: ${responseText}`);
    }

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
    const headers = await getAuthHeaders();

    // 3. CORRECCIÓN AQUI
    const res = await fetch(`${API_URL}/api/update-user`, {
      method: 'POST', 
      headers: headers,
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
    const headers = await getAuthHeaders();

    // 4. CORRECCIÓN AQUI
    const res = await fetch(`${API_URL}/api/delete-user`, {
      method: 'DELETE',
      headers: headers,
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