"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, getDocs, query, where, documentId } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import type { CartItemSnapshot, StoreProduct, ProductVariant } from "@/lib/types";

const saleItemSchema = z.array(z.object({
    inventoryId: z.string(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(), // Allows decimals for weight-based products (e.g. 0.350 kg)
    price: z.number().min(0),
    image: z.string(),
    costPriceUsd: z.number().min(0),
    variantId: z.string().optional(),
    variantName: z.string().optional(),
    unit: z.string().optional(),
}));

const createManualSaleSchema = z.object({
  items: z.string(),
  totalAmount: z.coerce.number().min(0),
  couponCode: z.string().optional(),
  couponDiscount: z.coerce.number().default(0),
  manualDiscount: z.coerce.number().default(0),
  finalTotal: z.coerce.number().min(0),
  userName: z.string().optional(),
  userNationalId: z.string().optional(),
  userPhoneNumber: z.string().optional(),
  tasaOficial: z.coerce.number().gt(0, "La tasa oficial debe ser mayor a cero."),
  tasaParalela: z.coerce.number().gt(0, "La tasa paralela debe ser mayor a cero."),
});

export async function createManualSale(storeId: string, formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = createManualSaleSchema.safeParse(values);

  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten());
    return { error: "Datos de venta inválidos." };
  }

  const { 
    totalAmount, 
    finalTotal, 
    couponCode, 
    couponDiscount, 
    manualDiscount, 
    userName, 
    userNationalId, 
    userPhoneNumber, 
    tasaOficial, 
    tasaParalela 
  } = validatedFields.data;

  let items: z.infer<typeof saleItemSchema>;
  try {
    items = saleItemSchema.parse(JSON.parse(validatedFields.data.items));
  } catch(e) {
    return { error: "Formato de artículos incorrecto." };
  }

  const batch = writeBatch(db);

  try {
    // --- 1. Crear el documento de la orden ---
    const orderRef = doc(collection(db, "Orders"));
    batch.set(orderRef, {
      storeId: storeId,
      storeName: "Venta en Tienda",
      userId: "IN_STORE_SALE", 
      items: items,
      totalAmount: totalAmount,
      shippingCost: 0,
      couponCode: couponCode || null,
      couponDiscount: couponDiscount,
      manualDiscount: manualDiscount,
      finalTotal: finalTotal,
      status: "DELIVERED",
      createdAt: Date.now(),
      type: "IN_STORE",
      inventoryDeducted: true,
      userName: userName || "Cliente en tienda",
      userNationalId: userNationalId || "",
      userPhoneNumber: userPhoneNumber || "",
      tasaOficial,
      tasaParalela,
    });
    
    // --- 2. Descontar el inventario ---
    const inventoryIds = [...new Set(items.map(item => item.inventoryId))];
    if (inventoryIds.length > 0) {
      const inventoryQuery = query(collection(db, 'Inventory'), where(documentId(), 'in', inventoryIds));
      const inventorySnap = await getDocs(inventoryQuery);
      
      const inventoryMap = new Map(inventorySnap.docs.map(doc => [doc.id, doc.data() as StoreProduct]));
      
      for (const item of items) {
        const invDocData = inventoryMap.get(item.inventoryId);
        if (!invDocData) throw new Error(`Producto ${item.productName} no encontrado en el inventario.`);

        if (item.variantId && invDocData.variants) {
            const variantIndex = invDocData.variants.findIndex((v: any) => v.id === item.variantId);
            if (variantIndex === -1) {
                throw new Error(`Variante "${item.variantName}" para el producto "${item.productName}" no encontrada.`);
            }

            if (invDocData.variants[variantIndex].stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${item.productName} (${invDocData.variants[variantIndex].name}). Disponible: ${invDocData.variants[variantIndex].stock}, Solicitado: ${item.quantity}`);
            }

            invDocData.variants[variantIndex].stock -= item.quantity;
            invDocData.currentStock = invDocData.variants.reduce((acc: any, v: any) => acc + v.stock, 0);

        } else {
            if (invDocData.currentStock < item.quantity) {
              throw new Error(`Stock insuficiente para ${item.productName}. Disponible: ${invDocData.currentStock}, Solicitado: ${item.quantity}`);
            }
            invDocData.currentStock -= item.quantity;
        }
      }

      // Aplicar las actualizaciones consolidadas al batch
      for (const [invId, invDocData] of inventoryMap.entries()) {
          batch.update(doc(db, "Inventory", invId), {
              variants: invDocData.variants || [],
              currentStock: invDocData.currentStock
          });
      }
    }

    await batch.commit();

    revalidatePath(`/store/${storeId}/my-products`);
    revalidatePath(`/store/${storeId}/pos`);
    revalidatePath(`/store/${storeId}/finance`);
    return { message: "Venta registrada exitosamente." };

  } catch (e: any) {
    console.error("Error creating manual sale:", e);
    return { error: `No se pudo registrar la venta: ${e.message}` };
  }
}
