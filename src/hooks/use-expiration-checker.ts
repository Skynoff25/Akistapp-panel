"use client";

import { useEffect, useRef } from "react";
import type { Order } from "@/lib/types";
import { markOrderExpired } from "@/app/store/[storeId]/orders/actions";

/**
 * Hook que evalúa en memoria (sin lecturas extra a Firestore) si alguna
 * orden PENDING sin pago ha superado su expiresAt.
 * Corre cada 60 segundos y también al montar. Usa un Set para evitar
 * marcar la misma orden dos veces en la misma sesión.
 */
export function useExpirationChecker(orders: Order[], storeId: string) {
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      const toExpire = orders.filter(
        (o) =>
          o.status === "PENDING" &&
          o.payment_status !== "paid" &&
          !o.paymentMessage && // Si reportó pago, no expira
          o.expiresAt !== undefined &&
          o.expiresAt < now &&
          !processedIds.current.has(o.id)
      );

      for (const order of toExpire) {
        processedIds.current.add(order.id); // Marcamos antes del await para evitar dobles llamadas
        const result = await markOrderExpired(storeId, order.id);
        if (result.error) {
          // Si hubo error, remover del set para reintentar en el próximo ciclo
          processedIds.current.delete(order.id);
        }
      }
    };

    check(); // Evaluar inmediatamente al montar o al cambiar `orders`
    const interval = setInterval(check, 60_000); // Re-evaluar cada minuto
    return () => clearInterval(interval);
  }, [orders, storeId]);
}
