"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, query, where, getCountFromServer } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  brand: z.string().min(1, "La marca es obligatoria"),
  description: z.string().min(1, "La descripción es obligatoria"),
  category: z.string().min(1, "La categoría es obligatoria"),
  image: z.string().url("Debe ser una URL válida").optional().or(z.literal('')),
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
    
    const { tags, ...productData } = validatedFields.data;

    try {
        await addDoc(collection(db, "Products"), {
            ...productData,
            normalizedName: productData.name.toLowerCase(),
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            image: productData.image || `https://picsum.photos/seed/${productData.name}/400/400`,
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

    const { tags, ...productData } = validatedFields.data;

    try {
        const productRef = doc(db, "Products", id);
        await updateDoc(productRef, {
            ...productData,
            normalizedName: productData.name.toLowerCase(),
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            image: productData.image || `https://picsum.photos/seed/${productData.name}/400/400`,
        });
        revalidatePath("/dashboard/products");
        return { message: "Producto actualizado exitosamente." };
    } catch (e: any) {
        console.error(e);
        return { errors: { _form: ["No se pudo actualizar el producto."] } };
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
