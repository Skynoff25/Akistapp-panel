"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, getDoc, query, collection, where, getDocs, documentId } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import type { CartItemSnapshot, Order, StoreProduct } from "@/lib/types";

const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED", "RETURNED"]),
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
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error("El pedido no existe.");
    const order = orderSnap.data() as Order;

    const batch = writeBatch(db);

    if (status === "DELIVERED") {
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
                    
                    if (item.variantId && invDoc.variants) {
                        const variantIndex = invDoc.variants.findIndex(v => v.id === item.variantId);
                        if (variantIndex !== -1) {
                            const updatedVariants = [...invDoc.variants];
                            updatedVariants[variantIndex].stock = Math.max(0, updatedVariants[variantIndex].stock - item.quantity);
                            const newTotalStock = updatedVariants.reduce((acc, v) => acc + v.stock, 0);
                            batch.update(inventoryRef, { variants: updatedVariants, currentStock: newTotalStock });
                        }
                    } else {
                        const newStock = (invDoc.currentStock || 0) - item.quantity;
                        batch.update(inventoryRef, { currentStock: newStock < 0 ? 0 : newStock });
                    }
                }
            }
        }
        batch.update(orderRef, { status: status, inventoryDeducted: true, inventoryRestored: false });
      } else {
        batch.update(orderRef, { status: status });
      }
      await batch.commit();

    } else if (status === "RETURNED") {
        // Solo reintegramos si el inventario fue descontado previamente y no ha sido ya restaurado
        if (order.inventoryDeducted && !order.inventoryRestored) {
            const inventoryIds = order.items.map(item => item.inventoryId).filter(Boolean);
            if (inventoryIds.length > 0) {
                const inventoryQuery = query(collection(db, 'Inventory'), where(documentId(), 'in', inventoryIds));
                const inventorySnap = await getDocs(inventoryQuery);
                const inventoryMap = new Map(inventorySnap.docs.map(doc => [doc.id, doc.data() as StoreProduct]));
                
                for (const item of order.items) {
                    const invDoc = inventoryMap.get(item.inventoryId);
                    if (invDoc) {
                        const inventoryRef = doc(db, 'Inventory', item.inventoryId);
                        
                        if (item.variantId && invDoc.variants) {
                            const variantIndex = invDoc.variants.findIndex(v => v.id === item.variantId);
                            if (variantIndex !== -1) {
                                const updatedVariants = [...invDoc.variants];
                                updatedVariants[variantIndex].stock += item.quantity;
                                const newTotalStock = updatedVariants.reduce((acc, v) => acc + v.stock, 0);
                                batch.update(inventoryRef, { variants: updatedVariants, currentStock: newTotalStock });
                            }
                        } else {
                            const newStock = (invDoc.currentStock || 0) + item.quantity;
                            batch.update(inventoryRef, { currentStock: newStock });
                        }
                    }
                }
            }
            batch.update(orderRef, { status: status, inventoryRestored: true });
        } else {
            batch.update(orderRef, { status: status });
        }
        await batch.commit();

    } else {
      await updateDoc(orderRef, { status });
    }

    revalidatePath(`/store/${storeId}/orders`);
    revalidatePath(`/store/${storeId}/my-products`);
    revalidatePath(`/store/${storeId}/finance`);
    return { message: "El estado del pedido ha sido actualizado." };
  } catch (e: any) {
    console.error(e);
    return { error: `No se pudo actualizar el estado del pedido. ${e.message}` };
  }
}

export async function applyManualDiscount(storeId: string, orderId: string, discount: number) {
    try {
        const orderRef = doc(db, "Orders", orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) throw new Error("El pedido no existe.");
        
        const order = orderSnap.data() as Order;
        const subtotal = order.totalAmount + (order.shippingCost || 0);
        const couponDiscount = order.couponDiscount || 0;
        
        const newFinalTotal = Math.max(0, subtotal - couponDiscount - discount);

        await updateDoc(orderRef, {
            manualDiscount: discount,
            finalTotal: newFinalTotal,
        });

        revalidatePath(`/store/${storeId}/orders`);
        return { success: true, message: "Descuento aplicado correctamente." };
    } catch (e: any) {
        return { error: e.message };
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
        costPriceUsd: z.number(),
        variantId: z.string().optional(),
        variantName: z.string().optional(),
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

    const orderData = orderSnap.data() as Order;
    const newSubtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = orderData.shippingCost || 0;
    const manualDisc = orderData.manualDiscount || 0;
    const couponDisc = orderData.couponDiscount || 0;
    
    const newFinalTotal = Math.max(0, (newSubtotal + shipping) - manualDisc - couponDisc);

    await updateDoc(orderRef, {
      items: items,
      totalAmount: newSubtotal,
      finalTotal: newFinalTotal,
    });

    revalidatePath(`/store/${storeId}/orders`);
    return { message: 'Pedido actualizado exitosamente.' };

  } catch(e: any) {
    console.error(e);
    return { error: `No se pudo actualizar el pedido. ${e.message}` };
  }
}
