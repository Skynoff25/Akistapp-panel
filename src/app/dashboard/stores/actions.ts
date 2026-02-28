"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, deleteField } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { uploadImage } from "@/lib/storage";

const storeSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    city: z.string().min(1, "La ciudad es obligatoria"),
    zipcode: z.string().min(1, "El código postal es obligatorio"),
    address: z.string().min(1, "La dirección es obligatoria"),
    phone: z.string().min(1, "El teléfono es obligatorio"),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    imageUrl: z.any().optional(),
    subscriptionPlan: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
    allowPickup: z.enum(['true', 'false']).transform(v => v === 'true'),
    allowDelivery: z.enum(['true', 'false']).transform(v => v === 'true'),
    deliveryType: z.enum(['FIXED', 'AGREEMENT']).optional(),
    deliveryFee: z.coerce.number().min(0).optional(),
    sponsoredKeywords: z.string().optional(),
    hasPos: z.enum(['true', 'false']).transform(v => v === 'true'),
    hasFinanceModule: z.enum(['true', 'false']).transform(v => v === 'true'),
    // Plan tracking fields
    planExpiresAt: z.string().optional(),
    lastPaymentAmount: z.coerce.number().optional(),
});

function getPlanDetails(plan: 'BASIC' | 'STANDARD' | 'PREMIUM') {
    switch (plan) {
        case 'BASIC':
            return { maxProducts: 20, allowReservations: false, featured: false };
        case 'STANDARD':
            return { maxProducts: 200, allowReservations: true, featured: false };
        case 'PREMIUM':
            return { maxProducts: 10000, allowReservations: true, featured: true };
    }
}

export async function createStore(formData: FormData) {
    const values = Object.fromEntries(formData.entries());
    const validatedFields = storeSchema.safeParse(values);

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { imageUrl: imageFile, planExpiresAt, lastPaymentAmount, ...dataFromForm } = validatedFields.data;
    const planDetails = getPlanDetails(dataFromForm.subscriptionPlan);
    let finalImageUrl = `https://picsum.photos/seed/${dataFromForm.name}/100/100`;

    try {
        if (imageFile instanceof File && imageFile.size > 0) {
            finalImageUrl = await uploadImage(imageFile, 'store_profile');
        }

        const storePayload: any = {
            ...dataFromForm,
            ...planDetails,
            isActive: true,
            isOpen: true,
            createdAt: Date.now(),
            imageUrl: finalImageUrl,
            sponsoredKeywords: dataFromForm.sponsoredKeywords
                ? dataFromForm.sponsoredKeywords.split(',').map(kw => kw.trim().toLowerCase()).filter(kw => kw)
                : [],
            planExpiresAt: planExpiresAt ? new Date(planExpiresAt).getTime() : null,
            lastPaymentAmount: lastPaymentAmount || 0,
            lastPaymentDate: lastPaymentAmount ? Date.now() : null,
        };

        if (storePayload.subscriptionPlan === 'BASIC') {
            storePayload.allowPickup = false;
            storePayload.allowDelivery = false;
        }

        await addDoc(collection(db, "Stores"), storePayload);
        revalidatePath("/dashboard/stores");
        return { message: "Tienda creada exitosamente." };
    } catch (e) {
        console.error("Error creating store:", e);
        return { message: "No se pudo crear la tienda." };
    }
}

export async function updateStore(id: string, formData: FormData) {
    const values = Object.fromEntries(formData.entries());
    const validatedFields = storeSchema.safeParse(values);

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { imageUrl: imageFile, planExpiresAt, lastPaymentAmount, ...dataFromForm } = validatedFields.data;
    const planDetails = getPlanDetails(dataFromForm.subscriptionPlan);
    
    try {
        const storeRef = doc(db, "Stores", id);
        const docSnap = await getDoc(storeRef);
        if (!docSnap.exists()) return { message: "La tienda no existe." };

        const currentData = docSnap.data();
        let finalImageUrl = currentData.imageUrl;
        if (imageFile instanceof File && imageFile.size > 0) {
            finalImageUrl = await uploadImage(imageFile, 'store_profile');
        }

        const dataToUpdate: any = {
            ...dataFromForm,
            ...planDetails,
            imageUrl: finalImageUrl,
            sponsoredKeywords: dataFromForm.sponsoredKeywords
                ? dataFromForm.sponsoredKeywords.split(',').map(kw => kw.trim().toLowerCase()).filter(kw => kw)
                : [],
            planExpiresAt: planExpiresAt ? new Date(planExpiresAt).getTime() : (currentData.planExpiresAt || null),
        };

        // Si el monto de pago cambió o se ingresó uno nuevo, actualizamos fecha de pago
        if (lastPaymentAmount !== undefined && lastPaymentAmount !== currentData.lastPaymentAmount) {
            dataToUpdate.lastPaymentAmount = lastPaymentAmount;
            dataToUpdate.lastPaymentDate = Date.now();
        }

        if (dataToUpdate.subscriptionPlan === 'BASIC') {
            dataToUpdate.allowPickup = false;
            dataToUpdate.allowDelivery = false;
        }

        await updateDoc(storeRef, dataToUpdate);
        revalidatePath("/dashboard/stores");
        return { message: "Tienda actualizada exitosamente." };
    } catch (e) {
        console.error("Error updating store:", e);
        return { message: "No se pudo actualizar la tienda." };
    }
}

export async function toggleStoreFeatured(storeId: string, featured: boolean) {
    try {
        const storeRef = doc(db, "Stores", storeId);
        await updateDoc(storeRef, { featured });
        revalidatePath("/dashboard/stores");
        return { success: true, message: `Tienda ${featured ? 'marcada como destacada' : 'eliminada de destacadas'}.` };
    } catch (e) {
        return { error: "No se pudo actualizar el estado destacado." };
    }
}

export async function deleteStore(id: string) {
    try {
        await deleteDoc(doc(db, "Stores", id));
        revalidatePath("/dashboard/stores");
        return { message: "Tienda eliminada exitosamente." };
    } catch (e) {
        return { message: "No se pudo eliminar la tienda." };
    }
}
