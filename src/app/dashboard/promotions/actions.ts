"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import type { Store } from "@/lib/types";
import { uploadImage } from "@/lib/storage";

const promotionSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  content: z.string().min(1, "El contenido es obligatorio"),
  imageUrl: z.any().optional(),
  storeId: z.string().min(1, "Debes seleccionar una tienda"),
  cityId: z.string().min(1, "El código postal es obligatorio"),
  isActive: z.boolean(),
  expiresAt: z.string().min(1, "La fecha de caducidad es obligatoria"),
});

export async function createPromotion(formData: FormData) {
  const values = {
    title: formData.get("title"),
    content: formData.get("content"),
    imageUrl: formData.get("imageUrl"),
    storeId: formData.get("storeId"),
    cityId: formData.get("cityId"),
    isActive: formData.get("isActive") === "true",
    expiresAt: formData.get("expiresAt"),
  };

  const validatedFields = promotionSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { storeId, cityId, expiresAt, imageUrl, ...promotionData } = validatedFields.data;
  let finalImageUrl = `https://picsum.photos/seed/${promotionData.title}/600/300`;

  try {
    if (imageUrl instanceof File && imageUrl.size > 0) {
        finalImageUrl = await uploadImage(imageUrl, "promotions");
    }

    const storeRef = doc(db, "Stores", storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      return { errors: { _form: ["La tienda seleccionada no existe."] } };
    }
    const storeData = storeSnap.data() as Store;

    await addDoc(collection(db, "Promotions"), {
      ...promotionData,
      storeId: storeId,
      storeName: storeData.name,
      cityId: cityId,
      type: "promotion",
      createdAt: Date.now(),
      expiresAt: new Date(expiresAt).getTime(),
      imageUrl: finalImageUrl,
    });

    revalidatePath("/dashboard/promotions");
    return { message: "Promoción creada exitosamente." };
  } catch (e: any) {
    return { errors: { _form: ["No se pudo crear la promoción. " + e.message] } };
  }
}

export async function updatePromotion(id: string, formData: FormData) {
  const values = {
    title: formData.get("title"),
    content: formData.get("content"),
    imageUrl: formData.get("imageUrl"),
    storeId: formData.get("storeId"),
    cityId: formData.get("cityId"),
    isActive: formData.get("isActive") === "true",
    expiresAt: formData.get("expiresAt"),
  };
  
  const validatedFields = promotionSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { storeId, cityId, expiresAt, imageUrl, ...promotionData } = validatedFields.data;

  try {
    const promotionRef = doc(db, "Promotions", id);
    const docSnap = await getDoc(promotionRef);
    if (!docSnap.exists()) {
        return { errors: { _form: ["La promoción no existe."] } };
    }

    let finalImageUrl = docSnap.data().imageUrl;
    if (imageUrl instanceof File && imageUrl.size > 0) {
        finalImageUrl = await uploadImage(imageUrl, "promotions");
    }

    const storeRef = doc(db, "Stores", storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      return { errors: { _form: ["La tienda seleccionada no existe."] } };
    }
    const storeData = storeSnap.data() as Store;
    
    await updateDoc(promotionRef, {
       ...promotionData,
       storeId: storeId,
       storeName: storeData.name,
       cityId: cityId,
       expiresAt: new Date(expiresAt).getTime(),
       imageUrl: finalImageUrl,
    });

    revalidatePath("/dashboard/promotions");
    revalidatePath(`/store/${storeId}/promotions`);
    return { message: "Promoción actualizada exitosamente." };
  } catch (e: any) {
    return { errors: { _form: ["No se pudo actualizar la promoción."] } };
  }
}

export async function deletePromotion(id: string) {
  try {
    await deleteDoc(doc(db, "Promotions", id));
    revalidatePath("/dashboard/promotions");
    return { message: "Promoción eliminada exitosamente." };
  } catch (e) {
    return { error: "No se pudo eliminar la promoción." };
  }
}
