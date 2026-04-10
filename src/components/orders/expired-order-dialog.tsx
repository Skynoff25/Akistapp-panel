"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageCircle, XCircle } from "lucide-react";
import type { Order } from "@/lib/types";
import { rescueExpiredOrder } from "@/app/store/[storeId]/orders/actions";
import { useToast } from "@/hooks/use-toast";

interface ExpiredOrderDialogProps {
  order: Order;
  storeName: string;
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExpiredOrderDialog({
  order,
  storeName,
  storeId,
  open,
  onOpenChange,
  onSuccess,
}: ExpiredOrderDialogProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  // Construir resumen de productos para el mensaje de WhatsApp
  const productSummary = order.items
    .map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity}`)
    .join(", ");

  const getWhatsAppUrl = () => {
    if (!order.userPhoneNumber) return null;
    const cleanPhone = order.userPhoneNumber.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hola ${order.userName || "cliente"}, te escribimos de ${storeName}. ` +
      `Tu reserva por: ${productSummary} ha vencido. ` +
      `¿Aún deseas retirarlo hoy? Pedido #${order.id.substring(0, 7)}.`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const handleCancelAndRelease = async () => {
    if (
      !confirm(
        "¿Confirmas cancelar esta reserva vencida y liberar el stock al inventario?"
      )
    )
      return;
    setIsCancelling(true);
    const result = await rescueExpiredOrder(storeId, order.id, "cancel");
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({
        title: "Reserva cancelada",
        description: "Stock reintegrado al inventario exitosamente.",
      });
      onOpenChange(false);
      onSuccess();
    }
    setIsCancelling(false);
  };

  const whatsAppUrl = getWhatsAppUrl();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Reserva Vencida — #{order.id.substring(0, 7)}
          </DialogTitle>
          <DialogDescription>
            Esta reserva expiró sin que el cliente completara el pago.
            Elige una acción para gestionar el caso.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          {/* Resumen del pedido */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-orange-800 mb-1">Productos apartados:</p>
            <ul className="space-y-0.5 text-orange-700">
              {order.items.map((item, i) => (
                <li key={i}>
                  • {item.productName}
                  {item.variantName && (
                    <span className="text-muted-foreground"> ({item.variantName})</span>
                  )}{" "}
                  ×{item.quantity}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-bold text-orange-800">
              Total: ${(order.finalTotal || order.totalAmount + order.shippingCost).toFixed(2)}
            </p>
          </div>

          {!whatsAppUrl && (
            <p className="text-xs text-muted-foreground text-center">
              El cliente no registró número de teléfono. Solo puedes cancelar.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Acción 1: Contactar por WhatsApp */}
          {whatsAppUrl && (
            <Button
              asChild
              variant="outline"
              className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
            >
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Contactar Cliente
              </a>
            </Button>
          )}

          {/* Acción 2: Cancelar y liberar stock */}
          <Button
            variant="destructive"
            className="gap-2"
            onClick={handleCancelAndRelease}
            disabled={isCancelling}
          >
            <XCircle className="h-4 w-4" />
            {isCancelling ? "Cancelando..." : "Cancelar y Liberar Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
