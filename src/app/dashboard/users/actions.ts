'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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

  const { email, name, rol } = validatedFields.data;

  // SIMULATION: In a real environment, you'd use the Firebase Admin SDK here.
  // This is blocked due to environment credentials not being configured.
  console.log('[SIMULATION] Creating user:');
  console.log({ email, name, rol });
  
  // Simulate a success response
  console.log('[SIMULATION] User created successfully.');

  revalidatePath("/dashboard/users");
  return { message: "Usuario creado exitosamente (Simulación)." };
}
