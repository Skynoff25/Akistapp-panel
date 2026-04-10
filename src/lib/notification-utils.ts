
import { adminMessaging, adminDb } from './firebase-admin';
import type { OrderStatus } from './types';

/**
 * Envía una notificación push a un usuario específico basada en el cambio de estado de su pedido.
 */
export async function sendTransactionalNotification(
  userId: string,
  storeName: string,
  orderId: string,
  newStatus: OrderStatus
) {
  if (!adminMessaging || !adminDb) {
    console.warn("[Notification] Firebase Admin not initialized. Skipping notification.");
    return;
  }

  try {
    // 1. Obtener los tokens del usuario
    const userDoc = await adminDb.collection("Users").doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const tokens: string[] = userData?.fcmTokens || [];

    if (tokens.length === 0) {
      console.log(`[Notification] No tokens found for user ${userId}.`);
      return;
    }

    // 2. Definir mensaje según el estado
    const orderRef = orderId.substring(0, 7);
    let title = "";
    let body = "";

    switch (newStatus) {
      case "CONFIRMED":
        title = "¡Pedido Confirmado! ✅";
        body = `Tu pedido #${orderRef} en ${storeName} ha sido confirmado y reservado.`;
        break;
      case "READY":
        title = "¡Pedido Listo! 📦";
        body = `Tu pedido #${orderRef} está listo para ser retirado o enviado.`;
        break;
      case "DELIVERED":
        title = "Pedido Entregado 🥳";
        body = `¡Gracias por tu compra! Tu pedido #${orderRef} ha sido entregado.`;
        break;
      case "CANCELLED":
        title = "Pedido Cancelado ❌";
        body = `Lo sentimos, tu pedido #${orderRef} ha sido cancelado por la tienda.`;
        break;
      case "EXPIRED_WARNING":
        title = "Reserva Vencida ⚠️";
        body = `Tu reserva del pedido #${orderRef} ha vencido por falta de pago.`;
        break;
      default:
        // No enviamos notificaciones para PENDING o estados desconocidos por ahora
        return;
    }

    // 3. Enviar a todos los dispositivos del usuario
    const response = await adminMessaging.sendEachForMulticast({
      tokens: tokens,
      notification: { title, body },
      data: {
        orderId: orderId,
        type: "order_status_change",
        status: newStatus
      }
    });

    console.log(`[Notification] Sent to ${response.successCount} devices for user ${userId}.`);

    // 4. Limpieza de tokens inválidos (opcional pero recomendado)
    const invalidTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = (res.error as any)?.code;
        if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(code)) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await adminDb.collection('Users').doc(userId).update({
        fcmTokens: require('firebase-admin').firestore.FieldValue.arrayRemove(...invalidTokens)
      });
    }

  } catch (error) {
    console.error("[Notification] Error sending transactional notification:", error);
  }
}
