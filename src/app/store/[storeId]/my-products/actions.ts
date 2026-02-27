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
import type { Product, Store, StoreProduct, ProductVariant } from '@/lib/types';
import { uploadImage } from '@/lib/storage';

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
      costPriceUsd: 0,
      casheaEligible: false,
      name: productData.name,
      brand: productData.brand,
      category: productData.category,
      description: productData.description || '',
      disclaimer: '',
      globalImage: productData.image || `https://picsum.photos/seed/${productId}/400/400`,
      storeName: storeData.name,
      storeAddress: `${storeData.address}, ${storeData.city}`,
      hasVariations: false,
      variants: [],
      priceRange: null,
    });

    revalidatePath(`/store/${storeId}/my-products`);
    return { success: 'Producto añadido a tu tienda.' };
  } catch (e: any) {
    return { error: 'No se pudo añadir el producto. ' + e.message };
  }
}


const variantSchema = z.array(z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre de la variante es obligatorio.'),
  price: z.coerce.number().min(0, 'El precio de la variante no puede ser negativo.'),
  stock: z.coerce.number().int('El stock de la variante debe ser un número entero.').min(0),
  sku: z.string().optional(),
}));

const updateStoreProductSchema = z.object({
  price: z.coerce.number().min(0, 'El precio no puede ser negativo.').optional(),
  promotionalPrice: z.coerce.number().min(0, "El precio debe ser positivo").optional().nullable(),
  currentStock: z.coerce.number().int('El stock debe ser un número entero.').min(0, 'El stock no puede ser negativo.').optional(),
  isAvailable: z.enum(['true', 'false']).transform(v => v === 'true'),
  storeSpecificImage: z.any().optional(),
  storeSpecificImageUrl: z.string().optional(),
  description: z.string().optional(),
  disclaimer: z.string().optional(),
  costPriceUsd: z.coerce.number().min(0, 'El costo no puede ser negativo.').optional(),
  casheaEligible: z.enum(['true', 'false']).transform(v => v === 'true'),
  hasVariations: z.enum(['true', 'false']).transform(v => v === 'true'),
  variants: z.string().optional(),
});


export async function updateStoreProduct(storeId: string, inventoryId: string, formData: FormData) {
    const values = Object.fromEntries(formData.entries());
    const validatedFields = updateStoreProductSchema.safeParse(values);

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    try {
        const productRef = doc(db, `Inventory`, inventoryId);
        const docSnap = await getDoc(productRef);
        if (!docSnap.exists()) {
            return { errors: { _form: ['El producto no existe.'] } };
        }

        const { promotionalPrice, variants: variantsJSON, storeSpecificImage, storeSpecificImageUrl, ...data } = validatedFields.data;
        
        const updateData: { [key: string]: any } = {...data};

        // Manejo de imagen: 1. URL texto, 2. Archivo nuevo, 3. Mantener vieja
        let finalImageUrl = storeSpecificImageUrl || docSnap.data().storeSpecificImage;
        
        if (!storeSpecificImageUrl && storeSpecificImage instanceof File && storeSpecificImage.size > 0) {
            finalImageUrl = await uploadImage(storeSpecificImage, 'store_products');
        } else if (!storeSpecificImageUrl && storeSpecificImage === "") {
             finalImageUrl = "";
        }
        updateData.storeSpecificImage = finalImageUrl;


        if (updateData.hasVariations) {
            if (!variantsJSON) {
                return { errors: { _form: ['Se esperaban variaciones pero no se recibieron.'] } };
            }
            try {
                const variants = variantSchema.parse(JSON.parse(variantsJSON));
                if (variants.length === 0) {
                    return { errors: { _form: ['Si un producto tiene variaciones, debe agregar al menos una.'] } };
                }
                
                updateData.variants = variants;
                updateData.currentStock = variants.reduce((acc, v) => acc + v.stock, 0);
                
                const prices = variants.map(v => v.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                
                updateData.price = minPrice;
                updateData.priceRange = minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
                updateData.promotionalPrice = deleteField();
                
            } catch (e) {
                console.error(e)
                return { errors: { _form: ['Las variaciones tienen un formato inválido.'] } };
            }
        } else {
             if (data.price === undefined || data.currentStock === undefined) {
                return { errors: { _form: ['El precio y el stock base son obligatorios cuando no hay variaciones.'] } };
            }
            updateData.variants = [];
            updateData.priceRange = null;

            if (promotionalPrice && promotionalPrice > 0) {
                updateData.promotionalPrice = promotionalPrice;
            } else {
                updateData.promotionalPrice = deleteField();
            }
        }
        
        updateData.costPriceUsd = data.costPriceUsd || 0;

        await updateDoc(productRef, updateData);

        revalidatePath(`/store/${storeId}/my-products`);
        revalidatePath(`/store/${storeId}`);
        revalidatePath(`/store/${storeId}/finance`);
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
