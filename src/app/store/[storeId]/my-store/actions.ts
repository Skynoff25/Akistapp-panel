
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Store } from '@/lib/types';

const updateMyStoreSchema = z.object({
  imageUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal('')),
  isOpen: z.enum(['true', 'false']).transform(v => v === 'true'),
  allowPickup: z.enum(['true', 'false']).transform(v => v === 'true'),
  allowDelivery: z.enum(['true', 'false']).transform(v => v === 'true'),
  deliveryType: z.enum(['FIXED', 'AGREEMENT']).optional(),
  deliveryFee: z.coerce.number().min(0, "La tarifa debe ser positiva.").optional(),
});

export async function updateMyStore(storeId: string, formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = updateMyStoreSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // A real app would have Firestore security rules to ensure
  // only the store manager can update their own store.

  try {
    const storeRef = doc(db, "Stores", storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
        return { message: "La tienda no existe." };
    }
    
    const store = storeSnap.data() as Store;
    const { ...dataToUpdate } = validatedFields.data;

    // Server-side guard to ensure BASIC plan cannot have these options enabled.
    if (store.subscriptionPlan === 'BASIC') {
        dataToUpdate.allowPickup = false;
        dataToUpdate.allowDelivery = false;
    }

    if (dataToUpdate.allowDelivery) {
        if (dataToUpdate.deliveryType === 'AGREEMENT') {
            dataToUpdate.deliveryFee = 0;
        }
    } else {
        dataToUpdate.deliveryType = undefined;
        dataToUpdate.deliveryFee = 0;
    }
    
    await updateDoc(storeRef, {
        ...dataToUpdate,
        imageUrl: validatedFields.data.imageUrl || `https://picsum.photos/seed/${storeId}/100/100`
    });

    revalidatePath(`/store/${storeId}/my-store`);
    revalidatePath(`/store/${storeId}`); // revalidate dashboard
    return { message: "Tu tienda ha sido actualizada." };
  } catch (e) {
    return { message: "No se pudo actualizar la tienda." };
  }
}
