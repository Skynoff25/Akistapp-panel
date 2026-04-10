"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, getDoc, query, collection, where, getDocs, documentId } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import type { CartItemSnapshot, Order, OrderStatus, StoreProduct } from "@/lib/types";
import { sendTransactionalNotification } from "@/lib/notification-utils";

const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED", "RETURNED", "EXPIRED_WARNING"]),
  payment_status: z.enum(["paid", "pending"]).optional(),
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

  const { status, payment_status } = validatedFields.data;

  try {
    const orderRef = doc(db, "Orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error("El pedido no existe.");
    const order = orderSnap.data() as Order;

    // Validación extra: Si el pedido está pagado, no puede pasar a EXPIRED_WARNING manualmente
    if (status === "EXPIRED_WARNING" && (order.payment_status === "paid" || order.paymentMessage)) {
      throw new Error("No se puede marcar como vencida una orden con pago confirmado o reportado.");
    }
    const batch = writeBatch(db);
    const inventoryUpdates = new Map<string, { doc: StoreProduct; ref: any }>();

    const getInventoryDoc = async (item: CartItemSnapshot) => {
        let invId = item.inventoryId || (item as any).id;
        if (!invId && !item.productId) return null;

        if (invId) {
            if (inventoryUpdates.has(invId)) return inventoryUpdates.get(invId);
            const snap = await getDoc(doc(db, 'Inventory', invId));
            if (snap.exists()) {
                const data = snap.data() as StoreProduct;
                const update = { doc: JSON.parse(JSON.stringify(data)), ref: snap.ref };
                inventoryUpdates.set(invId, update);
                return update;
            }
        }
        
        if (item.productId) {
            const q = query(collection(db, 'Inventory'), where('storeId', '==', storeId), where('productId', '==', item.productId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const invSnap = snap.docs[0];
                if (inventoryUpdates.has(invSnap.id)) return inventoryUpdates.get(invSnap.id);
                const data = invSnap.data() as StoreProduct;
                const update = { doc: JSON.parse(JSON.stringify(data)), ref: invSnap.ref };
                inventoryUpdates.set(invSnap.id, update);
                return update;
            }
        }
        return null;
    };

    if (status === "DELIVERED") {
      if (!order.inventoryDeducted) {
        for (const item of order.items) {
            const invUpdate = await getInventoryDoc(item);
            if (invUpdate) {
                const { doc: invDoc } = invUpdate;
                if (item.variantId && invDoc.variants) {
                    const variantIndex = invDoc.variants.findIndex((v: any) => v.id === item.variantId);
                    if (variantIndex !== -1) {
                        invDoc.variants[variantIndex].stock = Math.max(0, invDoc.variants[variantIndex].stock - item.quantity);
                        invDoc.currentStock = invDoc.variants.reduce((acc: number, v: any) => acc + v.stock, 0);
                    }
                } else {
                    invDoc.currentStock = Math.max(0, (invDoc.currentStock || 0) - item.quantity);
                }
            }
        }
        // Aplicar todas las actualizaciones acumuladas al batch
        inventoryUpdates.forEach((update) => {
            batch.update(update.ref, { variants: update.doc.variants || [], currentStock: update.doc.currentStock });
        });
        batch.update(orderRef, { status: status, inventoryDeducted: true, inventoryRestored: false });
      } else {
        batch.update(orderRef, { status: status });
      }
      await batch.commit();

    } else if (status === "RETURNED" || status === "CANCELLED") {
        // Reintegramos si el inventario fue descontado y no restaurado
        if (order.inventoryDeducted && !order.inventoryRestored) {
            for (const item of order.items) {
                const invUpdate = await getInventoryDoc(item);
                if (invUpdate) {
                    const { doc: invDoc } = invUpdate;
                    if (item.variantId && invDoc.variants) {
                        const variantIndex = invDoc.variants.findIndex((v: any) => v.id === item.variantId);
                        if (variantIndex !== -1) {
                            invDoc.variants[variantIndex].stock += item.quantity;
                            invDoc.currentStock = invDoc.variants.reduce((acc: number, v: any) => acc + v.stock, 0);
                        }
                    } else {
                        invDoc.currentStock = (invDoc.currentStock || 0) + item.quantity;
                    }
                }
            }
            // Aplicar todas las actualizaciones acumuladas al batch
            inventoryUpdates.forEach((update) => {
                batch.update(update.ref, { variants: update.doc.variants || [], currentStock: update.doc.currentStock });
            });
            const updates: any = { status, inventoryRestored: true };
            if (payment_status) updates.payment_status = payment_status;
            batch.update(orderRef, updates);
        } else {
            const updates: any = { status };
            if (payment_status) updates.payment_status = payment_status;
            batch.update(orderRef, updates);
        }
        await batch.commit();
    } else {
      const updates: any = { status };
      if (payment_status) updates.payment_status = payment_status;
      await updateDoc(orderRef, updates);
    }

    revalidatePath(`/store/${storeId}/orders`);
    revalidatePath(`/store/${storeId}/my-products`);
    revalidatePath(`/store/${storeId}/finance`);

    // ─── Enviar Notificación al Cliente (Async) ───
    if (order.userId) {
      // No esperamos a que termine para no bloquear la respuesta UI
      sendTransactionalNotification(order.userId, order.storeName || "La Tienda", order.id, status as OrderStatus);
    }

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
        quantity: z.number().min(0.001),
        price: z.number(),
        image: z.string().optional().nullable().default(""),
        costPriceUsd: z.number().optional().nullable().default(0),
        variantId: z.string().optional().nullable(),
        variantName: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        isGenericBrand: z.boolean().optional().nullable(),
        casheaEligible: z.boolean().optional().nullable(),
      })).parse(JSON.parse(str));
    } catch (e) {
      console.error("Error validando artículos:", e);
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

// ──────────────────────────────────────────────────────────────
// Módulo 2: Soft Expiration
// ──────────────────────────────────────────────────────────────

/**
 * Marca una orden PENDING como EXPIRED_WARNING.
 * Solo aplica si payment_status !== 'paid' y expiresAt ya pasó.
 */
export async function markOrderExpired(storeId: string, orderId: string) {
  try {
    const orderRef = doc(db, 'Orders', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return { error: 'Pedido no encontrado.' };
    const order = snap.data() as Order;
    if (order.status !== 'PENDING') return { skipped: true };
    if (order.payment_status === 'paid' || order.paymentMessage) return { skipped: true };
    await updateDoc(orderRef, { status: 'EXPIRED_WARNING' });
    revalidatePath(`/store/${storeId}/orders`);

    // ─── Enviar Notificación al Cliente (Async) ───
    if (order.userId) {
      sendTransactionalNotification(order.userId, order.storeName || "La Tienda", order.id, 'EXPIRED_WARNING');
    }

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Acción de rescate sobre una orden vencida.
 * action 'cancel' → cambia a CANCELLED y reintegra inventario.
 */
export async function rescueExpiredOrder(
  storeId: string,
  orderId: string,
  action: 'cancel'
) {
  try {
    const orderRef = doc(db, 'Orders', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error('El pedido no existe.');
    const order = snap.data() as Order;

    if (action === 'cancel') {
      const batch = writeBatch(db);
      const inventoryUpdates = new Map<string, { doc: StoreProduct; ref: any }>();

      if (order.inventoryDeducted && !order.inventoryRestored) {
        for (const item of order.items) {
          const invId = item.inventoryId;
          if (!invId) continue;
          if (!inventoryUpdates.has(invId)) {
            const invSnap = await getDoc(doc(db, 'Inventory', invId));
            if (invSnap.exists()) {
              const data = invSnap.data() as StoreProduct;
              inventoryUpdates.set(invId, { doc: JSON.parse(JSON.stringify(data)), ref: invSnap.ref });
            }
          }
          const invUpdate = inventoryUpdates.get(invId);
          if (invUpdate) {
            const { doc: invDoc } = invUpdate;
            if (item.variantId && invDoc.variants) {
              const vi = invDoc.variants.findIndex((v: any) => v.id === item.variantId);
              if (vi !== -1) {
                invDoc.variants[vi].stock += item.quantity;
                invDoc.currentStock = invDoc.variants.reduce((a: number, v: any) => a + v.stock, 0);
              }
            } else {
              invDoc.currentStock = (invDoc.currentStock || 0) + item.quantity;
            }
          }
        }
        inventoryUpdates.forEach((update) => {
          batch.update(update.ref, { variants: update.doc.variants || [], currentStock: update.doc.currentStock });
        });
        batch.update(orderRef, { status: 'CANCELLED', inventoryRestored: true });
      } else {
        batch.update(orderRef, { status: 'CANCELLED' });
      }
      await batch.commit();
    }

    revalidatePath(`/store/${storeId}/orders`);
    revalidatePath(`/store/${storeId}/my-products`);
    return { success: true, message: 'Orden cancelada y stock reintegrado.' };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Guarda la configuración de expiración de reservas en el documento de la tienda.
 */
export async function saveReservationConfig(
  storeId: string,
  reservationExpirationHours: 2 | 6 | 12 | 24
) {
  try {
    const storeRef = doc(db, 'Stores', storeId);
    await updateDoc(storeRef, { reservationExpirationHours });
    revalidatePath(`/store/${storeId}/orders`);
    return { success: true, message: 'Configuración guardada.' };
  } catch (e: any) {
    return { error: e.message };
  }
}
