'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  deleteField,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Product, Store, StoreProduct } from '@/lib/types';
import { auth } from '@/lib/firebase';

const addProductToStoreSchema = z.object({
  storeId: z.string(),
  productId: z.string(),
});

export async function addProductToStore(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = addProductToStoreSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos.' };
  }

  const { storeId, productId } = validatedFields.data;

  // Security check: ensure user has rights for this store
  // A real app would have more robust security rules in Firestore
  
  try {
    const storeRef = doc(db, 'Stores', storeId);
    const storeSnap = await getDoc(storeRef);
    if (!storeSnap.exists()) {
      return { error: 'La tienda no existe.' };
    }
    const storeData = storeSnap.data() as Store;

    const productRef = doc(db, 'Products', productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      return { error: 'El producto no existe.' };
    }
    const productData = productSnap.data() as Product;

    // Check if product already in store
    const existingQuery = query(
        collection(db, 'Inventory'),
        where('storeId', '==', storeId),
        where('productId', '==', productId)
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
        return { error: 'Este producto ya está en tu tienda.' };
    }
    
    // Check subscription limit
    const storeProductsQuery = query(collection(db, 'Inventory'), where('storeId', '==', storeId));
    const storeProductsSnap = await getCountFromServer(storeProductsQuery);
    
    if (storeProductsSnap.data().count >= storeData.maxProducts) {
        return { error: `Límite de ${storeData.maxProducts} productos alcanzado para tu plan.` };
    }

    await addDoc(collection(db, `Inventory`), {
      productId: productId,
      storeId: storeId,
      price: 0,
      isAvailable: true,
      currentStock: 0,
      // Denormalize product data for easier display
      name: productData.name,
      brand: productData.brand,
      category: productData.category,
      globalImage: productData.image || `https://picsum.photos/seed/${productId}/400/400`,
      // Denormalize store data for easier display
      storeName: storeData.name,
      storeAddress: `${storeData.address}, ${storeData.city}`
    });

    revalidatePath(`/store/${storeId}/my-products`);
    return { success: 'Producto añadido a tu tienda.' };
  } catch (e: any) {
    return { error: 'No se pudo añadir el producto. ' + e.message };
  }
}


const updateStoreProductSchema = z.object({
  price: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  promotionalPrice: z.coerce.number().min(0, "El precio debe ser positivo").optional().nullable(),
  currentStock: z.coerce.number().int('El stock debe ser un número entero.').min(0, 'El stock no puede ser negativo.'),
  isAvailable: z.enum(['true', 'false']).transform(v => v === 'true'),
  storeSpecificImage: z.string().url().optional().or(z.literal('')),
});


export async function updateStoreProduct(storeId: string, inventoryId: string, formData: FormData) {
    const values = {
      price: formData.get('price'),
      promotionalPrice: formData.get('promotionalPrice'),
      currentStock: formData.get('currentStock'),
      isAvailable: formData.get('isAvailable'),
      storeSpecificImage: formData.get('storeSpecificImage'),
    };
    const validatedFields = updateStoreProductSchema.safeParse(values);

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    try {
        const productRef = doc(db, `Inventory`, inventoryId);
        const { promotionalPrice, ...data } = validatedFields.data;
        
        const updateData: any = {...data};

        if (promotionalPrice && promotionalPrice > 0) {
            updateData.promotionalPrice = promotionalPrice;
        } else {
            updateData.promotionalPrice = deleteField();
        }

        await updateDoc(productRef, updateData);

        revalidatePath(`/store/${storeId}/my-products`);
        revalidatePath(`/store/${storeId}`);
        return { message: 'Producto actualizado.' };
    } catch(e) {
        console.error(e);
        return { errors: { _form: ['No se pudo actualizar el producto.'] } };
    }
}


export async function removeProductFromStore(storeId: string, inventoryId: string) {
    try {
        await deleteDoc(doc(db, `Inventory`, inventoryId));
        revalidatePath(`/store/${storeId}/my-products`);
        return { message: 'Producto eliminado de tu tienda.' };
    } catch(e) {
        return { error: 'No se pudo eliminar el producto.' };
    }
}
