"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, deleteField } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const storeSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    city: z.string().min(1, "La ciudad es obligatoria"),
    zipcode: z.string().min(1, "El código postal es obligatorio"),
    address: z.string().min(1, "La dirección es obligatoria"),
    phone: z.string().min(1, "El teléfono es obligatorio"),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    imageUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal('')),
    subscriptionPlan: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
    allowPickup: z.enum(['true', 'false']).transform(v => v === 'true'),
    allowDelivery: z.enum(['true', 'false']).transform(v => v === 'true'),
    deliveryType: z.enum(['FIXED', 'AGREEMENT']).optional(),
    deliveryFee: z.coerce.number().min(0).optional(),
    sponsoredKeywords: z.string().optional(),
    hasPos: z.enum(['true', 'false']).transform(v => v === 'true'),
    hasFinanceModule: z.enum(['true', 'false']).transform(v => v === 'true'),
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
    const values = {
        name: formData.get("name") as string,
        city: formData.get("city") as string,
        zipcode: formData.get("zipcode") as string,
        address: formData.get("address") as string,
        phone: formData.get("phone") as string,
        latitude: formData.get("latitude") as string,
        longitude: formData.get("longitude") as string,
        imageUrl: formData.get("imageUrl") as string,
        subscriptionPlan: formData.get("subscriptionPlan") as 'BASIC' | 'STANDARD' | 'PREMIUM',
        allowPickup: formData.get("allowPickup") as string,
        allowDelivery: formData.get("allowDelivery") as string,
        deliveryType: formData.get("deliveryType") as 'FIXED' | 'AGREEMENT' | undefined,
        deliveryFee: formData.get("deliveryFee") as string | undefined,
        sponsoredKeywords: formData.get("sponsoredKeywords") as string | undefined,
        hasPos: formData.get("hasPos") as string,
        hasFinanceModule: formData.get("hasFinanceModule") as string,
    };

    const validatedFields = storeSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const dataFromForm = validatedFields.data;
    const planDetails = getPlanDetails(dataFromForm.subscriptionPlan);

    const storePayload: any = {
        ...dataFromForm,
        ...planDetails,
        isActive: true,
        isOpen: true,
        createdAt: Date.now(),
        imageUrl: dataFromForm.imageUrl || `https://picsum.photos/seed/${dataFromForm.name}/100/100`,
        sponsoredKeywords: dataFromForm.sponsoredKeywords
            ? dataFromForm.sponsoredKeywords.split(',').map(kw => kw.trim().toLowerCase()).filter(kw => kw)
            : [],
    };

    if (storePayload.subscriptionPlan === 'BASIC') {
        storePayload.allowPickup = false;
        storePayload.allowDelivery = false;
    }

    if (storePayload.allowDelivery) {
        if (storePayload.deliveryType === 'AGREEMENT') {
            storePayload.deliveryFee = 0;
        }
    } else {
        delete storePayload.deliveryType;
        storePayload.deliveryFee = 0;
    }


    try {
        await addDoc(collection(db, "Stores"), storePayload);
        revalidatePath("/dashboard/stores");
        return { message: "Tienda creada exitosamente." };
    } catch (e) {
        console.error("Error creating store:", e);
        return { message: "No se pudo crear la tienda." };
    }
}

export async function updateStore(id: string, formData: FormData) {
    const values = {
        name: formData.get("name") as string,
        city: formData.get("city") as string,
        zipcode: formData.get("zipcode") as string,
        address: formData.get("address") as string,
        phone: formData.get("phone") as string,
        latitude: formData.get("latitude") as string,
        longitude: formData.get("longitude") as string,
        imageUrl: formData.get("imageUrl") as string,
        subscriptionPlan: formData.get("subscriptionPlan") as 'BASIC' | 'STANDARD' | 'PREMIUM',
        allowPickup: formData.get("allowPickup") as string,
        allowDelivery: formData.get("allowDelivery") as string,
        deliveryType: formData.get("deliveryType") as 'FIXED' | 'AGREEMENT' | undefined,
        deliveryFee: formData.get("deliveryFee") as string | undefined,
        sponsoredKeywords: formData.get("sponsoredKeywords") as string | undefined,
        hasPos: formData.get("hasPos") as string,
        hasFinanceModule: formData.get("hasFinanceModule") as string,
    };

    const validatedFields = storeSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const planDetails = getPlanDetails(validatedFields.data.subscriptionPlan);
    const dataToUpdate: { [key: string]: any } = { ...validatedFields.data };
    
    dataToUpdate.sponsoredKeywords = validatedFields.data.sponsoredKeywords
        ? validatedFields.data.sponsoredKeywords.split(',').map(kw => kw.trim().toLowerCase()).filter(kw => kw)
        : [];

    if (dataToUpdate.subscriptionPlan === 'BASIC') {
        dataToUpdate.allowPickup = false;
        dataToUpdate.allowDelivery = false;
    }
    
    if (dataToUpdate.allowDelivery) {
        if (dataToUpdate.deliveryType === 'AGREEMENT') {
            dataToUpdate.deliveryFee = 0;
        }
    } else {
        dataToUpdate.deliveryType = deleteField();
        dataToUpdate.deliveryFee = 0;
    }

    try {
        const storeRef = doc(db, "Stores", id);
        await updateDoc(storeRef, {
            ...dataToUpdate,
            ...planDetails,
            imageUrl: validatedFields.data.imageUrl || `https://picsum.photos/seed/${validatedFields.data.name}/100/100`
        });
        revalidatePath("/dashboard/stores");
        return { message: "Tienda actualizada exitosamente." };
    } catch (e) {
        console.error("Error updating store:", e);
        return { message: "No se pudo actualizar la tienda." };
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
