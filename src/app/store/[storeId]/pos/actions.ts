"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, getDocs, query, where, documentId } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import type { CartItemSnapshot, StoreProduct } from "@/lib/types";

const saleItemSchema = z.array(z.object({
    inventoryId: z.string(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
    image: z.string(),
}));

const createManualSaleSchema = z.object({
  items: z.string(),
  totalAmount: z.coerce.number().min(0),
});

export async function createManualSale(storeId: string, formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = createManualSaleSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Datos de venta inválidos." };
  }

  const { totalAmount } = validatedFields.data;
  let items: z.infer<typeof saleItemSchema>;
  try {
    items = saleItemSchema.parse(JSON.parse(validatedFields.data.items));
  } catch(e) {
    return { error: "Formato de artículos incorrecto." };
  }

  const batch = writeBatch(db);

  try {
    const storeRef = doc(db, "Stores", storeId);
    
    // --- 1. Crear el documento de la orden ---
    const orderRef = doc(collection(db, "Orders"));
    batch.set(orderRef, {
      storeId: storeId,
      storeName: "Venta en Tienda", // Se podría denormalizar el nombre de la tienda aquí
      userId: "IN_STORE_SALE", // ID genérico para ventas en tienda
      items: items,
      totalAmount: totalAmount,
      shippingCost: 0,
      status: "DELIVERED",
      createdAt: Date.now(),
      type: "IN_STORE",
      inventoryDeducted: true, // Se descuenta al momento de la venta
    });
    
    // --- 2. Descontar el inventario ---
    const inventoryIds = items.map(item => item.inventoryId);
    if (inventoryIds.length > 0) {
      const inventoryQuery = query(collection(db, 'Inventory'), where(documentId(), 'in', inventoryIds));
      const inventorySnap = await getDocs(inventoryQuery);
      
      if (inventorySnap.docs.length !== inventoryIds.length) {
        throw new Error("Algunos productos del carrito ya no existen en el inventario.");
      }

      const inventoryMap = new Map(inventorySnap.docs.map(doc => [doc.id, doc.data() as StoreProduct]));
      
      for (const item of items) {
        const invDocData = inventoryMap.get(item.inventoryId);
        if (!invDocData) throw new Error(`Producto ${item.productName} no encontrado.`);

        if (invDocData.currentStock < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.productName}. Disponible: ${invDocData.currentStock}, Solicitado: ${item.quantity}`);
        }
        
        const invDocRef = doc(db, "Inventory", item.inventoryId);
        const newStock = invDocData.currentStock - item.quantity;
        batch.update(invDocRef, { currentStock: newStock });
      }
    }

    await batch.commit();

    revalidatePath(`/store/${storeId}/my-products`);
    revalidatePath(`/store/${storeId}/pos`);
    return { message: "Venta registrada exitosamente." };

  } catch (e: any) {
    console.error("Error creating manual sale:", e);
    return { error: `No se pudo registrar la venta: ${e.message}` };
  }
}
