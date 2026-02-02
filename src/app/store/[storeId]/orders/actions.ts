"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, getDoc, query, collection, where, getDocs, documentId } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import type { CartItemSnapshot, Order, StoreProduct } from "@/lib/types";

const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED"]),
});

export async function updateOrderStatus(storeId: string, orderId: string, formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = updateOrderStatusSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      error: "Campos inválidos."
    };
  }

  const { status } = validatedFields.data;

  try {
    const orderRef = doc(db, "Orders", orderId);

    if (status === "DELIVERED") {
      const batch = writeBatch(db);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) throw new Error("El pedido no existe.");

      const order = orderSnap.data() as Order;
      
      // Solo descontar inventario si no ha sido descontado antes
      if (!order.inventoryDeducted) {
        const inventoryIds = order.items.map(item => item.inventoryId).filter(Boolean);
        if (inventoryIds.length > 0) {
            const inventoryQuery = query(collection(db, 'Inventory'), where(documentId(), 'in', inventoryIds));
            const inventorySnap = await getDocs(inventoryQuery);
            const inventoryMap = new Map(inventorySnap.docs.map(doc => [doc.id, doc.data() as StoreProduct]));
            
            for (const item of order.items) {
                const invDoc = inventoryMap.get(item.inventoryId);
                if (invDoc) {
                    const inventoryRef = doc(db, 'Inventory', item.inventoryId);
                    const newStock = (invDoc.currentStock || 0) - item.quantity;
                    batch.update(inventoryRef, { currentStock: newStock < 0 ? 0 : newStock });
                }
            }
        }
        batch.update(orderRef, { status: status, inventoryDeducted: true });
      } else {
        // Si ya se descontó, solo actualizar el estado
        batch.update(orderRef, { status: status });
      }

      await batch.commit();

    } else {
      // Para otros estados, solo actualizar el estado.
      await updateDoc(orderRef, { status });
    }

    revalidatePath(`/store/${storeId}/orders`);
    revalidatePath(`/store/${storeId}/my-products`);
    return { message: "El estado del pedido ha sido actualizado." };
  } catch (e: any) {
    console.error(e);
    return { error: `No se pudo actualizar el estado del pedido. ${e.message}` };
  }
}

const updateOrderItemsSchema = z.object({
  items: z.string().transform((str, ctx) => {
    try {
      return z.array(z.object({
        inventoryId: z.string(),
        productId: z.string(),
        productName: z.string(),
        quantity: z.number().int().min(1),
        price: z.number(),
        image: z.string(),
      })).parse(JSON.parse(str));
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON for items' });
      return z.NEVER;
    }
  })
});


export async function updateOrderItems(storeId: string, orderId: string, formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = updateOrderItemsSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Datos de artículos inválidos." };
  }
  
  const { items } = validatedFields.data;

  try {
    const orderRef = doc(db, 'Orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists() || orderSnap.data().status !== 'PENDING') {
      return { error: "El pedido no se puede modificar o no existe." };
    }

    const newTotalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    await updateDoc(orderRef, {
      items: items,
      totalAmount: newTotalAmount,
    });

    revalidatePath(`/store/${storeId}/orders`);
    return { message: 'Pedido actualizado exitosamente.' };

  } catch(e: any) {
    console.error(e);
    return { error: `No se pudo actualizar el pedido. ${e.message}` };
  }
}
