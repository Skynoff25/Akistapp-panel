"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, query, where, getCountFromServer } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { uploadImage } from "@/lib/storage";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  brand: z.string().min(1, "La marca es obligatoria"),
  description: z.string().min(1, "La descripción es obligatoria"),
  category: z.string().min(1, "La categoría es obligatoria"),
  image: z.any().optional(),
  imageUrl: z.string().optional(),
  tags: z.string().optional(),
});

export async function createProduct(formData: FormData) {
    const values = Object.fromEntries(formData.entries());
    const validatedFields = productSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { image, imageUrl, tags, ...productData } = validatedFields.data;
    let finalImageUrl = imageUrl || `https://picsum.photos/seed/${productData.name}/400/400`;

    try {
        // Prioridad: 1. URL de texto, 2. Archivo subido
        if (!imageUrl && image instanceof File && image.size > 0) {
            finalImageUrl = await uploadImage(image, "store_products");
        }

        await addDoc(collection(db, "Products"), {
            ...productData,
            normalizedName: productData.name.toLowerCase(),
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            image: finalImageUrl,
            isRecommended: false,
        });
        revalidatePath("/dashboard/products");
        return { message: "Producto creado exitosamente." };
    } catch (e: any) {
        console.error(e);
        return { errors: { _form: ["No se pudo crear el producto."] } };
    }
}


export async function updateProduct(id: string, formData: FormData) {
    const values = Object.fromEntries(formData.entries());
    const validatedFields = productSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { image, imageUrl, tags, ...productData } = validatedFields.data;

    try {
        const productRef = doc(db, "Products", id);
        const docSnap = await getDoc(productRef);
        if (!docSnap.exists()) {
             return { errors: { _form: ["El producto no existe."] } };
        }

        let finalImageUrl = imageUrl || docSnap.data().image; // Usa URL nueva o mantiene la vieja
        
        // Si no hay URL de texto y hay un archivo nuevo, lo subimos
        if (!imageUrl && image instanceof File && image.size > 0) {
            finalImageUrl = await uploadImage(image, "store_products");
        }
        
        await updateDoc(productRef, {
            ...productData,
            normalizedName: productData.name.toLowerCase(),
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            image: finalImageUrl,
        });
        revalidatePath("/dashboard/products");
        return { message: "Producto actualizado exitosamente." };
    } catch (e: any) {
        console.error(e);
        return { errors: { _form: ["No se pudo actualizar el producto."] } };
    }
}

export async function toggleProductRecommendation(productId: string, isRecommended: boolean) {
    try {
        const productRef = doc(db, "Products", productId);
        await updateDoc(productRef, { isRecommended });
        revalidatePath("/dashboard/products");
        return { success: true, message: `Producto ${isRecommended ? 'añadido a' : 'eliminado de'} recomendados.` };
    } catch (e) {
        return { error: "No se pudo actualizar el estado de recomendación." };
    }
}

export async function deleteProduct(id: string) {
    try {
        await deleteDoc(doc(db, "Products", id));
        revalidatePath("/dashboard/products");
        return { message: "Producto eliminado exitosamente." };
    } catch (e) {
        return { error: "No se pudo eliminar el producto." };
    }
}
