
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, deleteField } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Store } from '@/lib/types';
import { uploadImage } from '@/lib/storage';

const updateMyStoreSchema = z.object({
  imageUrl: z.any().optional(),
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
    const { imageUrl: imageFile, ...dataFromForm } = validatedFields.data;
    const dataToUpdate: { [key: string]: any } = { ...dataFromForm };

    let finalImageUrl = store.imageUrl;
    if (imageFile instanceof File && imageFile.size > 0) {
        finalImageUrl = await uploadImage(imageFile, 'store_profile');
    }
    dataToUpdate.imageUrl = finalImageUrl;

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
        // When delivery is disabled, remove the type field and reset fee.
        dataToUpdate.deliveryType = deleteField();
        dataToUpdate.deliveryFee = 0;
    }

    await updateDoc(storeRef, dataToUpdate);

    revalidatePath(`/store/${storeId}/my-store`);
    revalidatePath(`/store/${storeId}`); // revalidate dashboard
    return { message: "Tu tienda ha sido actualizada." };
  } catch (e) {
    console.error("Error updating store:", e);
    return { message: "No se pudo actualizar la tienda." };
  }
}
