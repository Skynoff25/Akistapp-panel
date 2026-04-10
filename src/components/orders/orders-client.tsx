"use client";

import { useState, useMemo, useEffect } from "react";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { useDocument } from "@/hooks/use-document";
import { useExpirationChecker } from "@/hooks/use-expiration-checker";
import { where } from "firebase/firestore";
import type { Order, OrderStatus, Store, PaymentMethod } from "@/lib/types";
import { PageHeader } from "../ui/page-header";
import Loader from "../ui/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Search,
  FileText,
  MessageCircle,
  Percent,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Settings2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { HelpTip } from "@/components/ui/help-tip";

const ITEMS_PER_PAGE = 15;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import {
  updateOrderStatus,
  applyManualDiscount,
  saveReservationConfig,
} from "@/app/store/[storeId]/orders/actions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { ReportUserDialog } from "../reports/report-user-dialog";
import { getImageUrl } from "@/lib/utils";
import { EditOrderDialog } from "./edit-order-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { OrderReceipt } from "./order-receipt";
import { OrderKpiBar } from "./order-kpi-bar";
import { ExpiredOrderDialog } from "./expired-order-dialog";

interface OrdersClientProps {
  storeId: string;
}

// ─── Tipos de filtro extendidos ───────────────────────────────────────────────
type ExtendedFilter = OrderStatus | "ALL" | "PAYMENT_REPORTED";

// ─── Traducciones y colores ───────────────────────────────────────────────────
const statusTranslations: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  READY: "Listo para Recoger/Enviar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  RETURNED: "Devuelto (Stock Reintegrado)",
  EXPIRED_WARNING: "Reserva Vencida",
};

const statusColors: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-500",
  CONFIRMED: "bg-blue-500",
  READY: "bg-purple-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
  RETURNED: "bg-gray-500",
  EXPIRED_WARNING: "bg-orange-500",
};

// ─── Dialog: Descuento Manual ─────────────────────────────────────────────────
function ManualDiscountDialog({
  order,
  storeId,
  open,
  onOpenChange,
  onSuccess,
}: {
  order: Order;
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [discount, setDiscount] = useState(order.manualDiscount || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleApply = async () => {
    setIsSubmitting(true);
    const res = await applyManualDiscount(storeId, order.id, discount);
    if (res.error) toast({ variant: "destructive", title: "Error", description: res.error });
    else {
      toast({ title: "Descuento aplicado" });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Aplicar Descuento Manual</DialogTitle>
          <DialogDescription>
            Resta un monto fijo al total del pedido antes de despachar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Monto a descontar ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="p-3 bg-muted rounded-md text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${(order.totalAmount + order.shippingCost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-destructive font-bold">
              <span>Descuento:</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t mt-2 pt-2 font-bold text-lg">
              <span>Total Estimado:</span>
              <span>
                $
                {Math.max(
                  0,
                  order.totalAmount + order.shippingCost - (order.couponDiscount || 0) - discount
                ).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isSubmitting}>
            Aplicar Descuento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Configuración de Órdenes ────────────────────────────────────────
function OrderConfigDialog({
  storeId,
  currentHours,
  open,
  onOpenChange,
}: {
  storeId: string;
  currentHours: 2 | 6 | 12 | 24;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [hours, setHours] = useState<2 | 6 | 12 | 24>(currentHours);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setHours(currentHours);
  }, [currentHours]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveReservationConfig(storeId, hours);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "Configuración guardada", description: result.message });
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración de Órdenes
          </DialogTitle>
          <DialogDescription>
            Define el tiempo máximo que una reserva sin pago puede estar activa antes
            de marcarse como vencida.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expiration-hours">Tiempo límite de reserva (sin pago)</Label>
            <Select
              value={String(hours)}
              onValueChange={(v) => setHours(Number(v) as 2 | 6 | 12 | 24)}
            >
              <SelectTrigger id="expiration-hours">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 horas</SelectItem>
                <SelectItem value="6">6 horas</SelectItem>
                <SelectItem value="12">12 horas</SelectItem>
                <SelectItem value="24">24 horas (predeterminado)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Solo aplica a órdenes con <strong>Pago en Tienda</strong> (payment_status: pending).
              Las órdenes ya pagadas nunca expiran.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Detalles de Orden ────────────────────────────────────────────────
function OrderDetailsDialog({
  order,
  store,
  open,
  onOpenChange,
  onReportSuccess,
  onApplyDiscount,
}: {
  order: Order | null;
  store: Store | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportSuccess: () => void;
  onApplyDiscount: () => void;
}) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [isReportDialogOpen, setReportDialogOpen] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  // Early return AFTER all hooks (Rules of Hooks)
  if (!order) return null;

  const activePaymentMethods = store?.paymentMethods?.filter((pm) => pm.isActive) || [];
  const hasPaymentReport = !!order.paymentMessage && ["PENDING", "CONFIRMED", "READY", "EXPIRED_WARNING"].includes(order.status);


  const handleConfirmPayment = async () => {
    setIsConfirmingPayment(true);
    const formData = new FormData();
    formData.append("status", "READY");
    formData.append("payment_status", "paid");
    const result = await updateOrderStatus(store?.id || "", order.id, formData);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({
        title: "✅ Pago confirmado",
        description: "Orden marcada como Lista para entregar.",
      });
      onOpenChange(false);
    }
    setIsConfirmingPayment(false);
  };


  const getWhatsAppUrl = () => {
    if (!order.userPhoneNumber) return null;
    const cleanPhone = order.userPhoneNumber.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hola ${order.userName || "cliente"}, te contactamos de ${store?.name || "la tienda"} referente a tu pago del pedido #${order.id.substring(0, 7)}. ¿Podrías confirmar el estado?`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles del Pedido #{order.id.substring(0, 7)}</DialogTitle>
          <DialogDescription>
            Realizado el{" "}
            {format(new Date(order.createdAt), "dd 'de' MMMM, yyyy 'a las' HH:mm", {
              locale: es,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold">Cliente:</span> {order.userName || "N/A"}
            </div>
            <div>
              <span className="font-semibold">Email:</span> {order.userEmail || "N/A"}
            </div>
            <div>
              <span className="font-semibold">Teléfono:</span>{" "}
              {order.userPhoneNumber || "N/A"}
            </div>
            <div>
              <span className="font-semibold">Método:</span>{" "}
              {order.deliveryMethod === "PICKUP"
                ? "Recoger en tienda"
                : "Envío a domicilio"}
            </div>
            <div>
              <span className="font-semibold">Estado:</span>{" "}
              <span className="font-medium text-primary">
                {statusTranslations[order.status]}
              </span>
            </div>
          </div>
          {order.deliveryMethod === "DELIVERY" && (
            <div>
              <span className="font-semibold">Dirección:</span> {order.deliveryAddress}
            </div>
          )}
          {order.comments && (
            <div>
              <span className="font-semibold">Comentarios:</span> {order.comments}
            </div>
          )}

          {/* ── Pago Reportado — Módulo 3.3 ── */}
          {order.paymentMessage && (
            <div
              className={`mt-2 p-3 rounded-md border-l-4 ${
                hasPaymentReport
                  ? "bg-emerald-50 text-emerald-800 border-emerald-500"
                  : "bg-green-50 text-green-800 border-green-500"
              }`}
            >
              <p className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Pago Reportado por Cliente
              </p>
              <p className="text-sm mt-1">
                <span className="font-medium">Referencia/Mensaje:</span>{" "}
                {order.paymentMessage}
              </p>
              {order.paymentMethod && (
                <p className="text-sm">
                  <span className="font-medium">Método seleccionado:</span>{" "}
                  {order.paymentMethod.type}
                </p>
              )}

              {/* Acciones de validación de pago */}
              {hasPaymentReport && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleConfirmPayment}
                    disabled={isConfirmingPayment}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isConfirmingPayment ? "Procesando..." : "Pago Confirmado – Pasar a Listo"}
                  </Button>
                  {getWhatsAppUrl() && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-orange-400 text-orange-700 hover:bg-orange-50"
                      asChild
                    >
                      <a href={getWhatsAppUrl()!} target="_blank" rel="noopener noreferrer">
                        <XCircle className="h-3.5 w-3.5" />
                        Pago No Encontrado
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Artículos del pedido */}
          <div className="mt-4 border rounded-md border-slate-100">
            <button
              type="button"
              onClick={() => setShowProducts(!showProducts)}
              className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 text-slate-900 font-bold text-sm rounded-t-md"
            >
              <span>Artículos del Pedido ({order.items.length})</span>
              <span className="text-slate-500">
                {showProducts ? "▲ Ocultar" : "▼ Ver lista"}
              </span>
            </button>
            <div
              className={`overflow-x-auto border-t ${showProducts ? "block" : "hidden"}`}
            >
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => {
                    const uniqueKey = item.variantId
                      ? `${item.inventoryId}-${item.variantId}`
                      : item.inventoryId;
                    return (
                      <TableRow key={`${uniqueKey}-${index}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Image
                              src={getImageUrl(item.image, item.productId, 40, 40)}
                              alt={item.productName}
                              width={40}
                              height={40}
                              className="rounded-md object-cover flex-shrink-0"
                            />
                            <div className="min-w-[120px]">
                              <p className="font-medium line-clamp-2">
                                {item.productName}
                              </p>
                              {item.variantName && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {item.variantName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          ${item.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          ${(item.price * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totales */}
          <div className="grid justify-end gap-2 text-right mt-4 bg-muted/30 p-4 rounded-lg">
            <div>
              <span className="text-muted-foreground">Subtotal:</span> $
              {order.totalAmount.toFixed(2)}
            </div>
            <div>
              <span className="text-muted-foreground">Costo de envío:</span> $
              {order.shippingCost.toFixed(2)}
            </div>
            {order.couponCode && (
              <div className="text-primary">
                <span className="font-semibold">Cupón ({order.couponCode}):</span> -$
                {(order.couponDiscount || 0).toFixed(2)}
              </div>
            )}
            {order.manualDiscount && order.manualDiscount > 0 && (
              <div className="text-destructive">
                <span className="font-semibold">Descuento Manual:</span> -$
                {order.manualDiscount.toFixed(2)}
              </div>
            )}
            <div className="text-xl font-bold pt-2 border-t">
              <span className="mr-2">TOTAL FINAL:</span>$
              {order.finalTotal?.toFixed(2) ||
                (order.totalAmount + order.shippingCost).toFixed(2)}
            </div>
          </div>

          {/* Métodos de pago disponibles */}
          {order.status === "PENDING" && activePaymentMethods.length > 0 && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <div className="bg-blue-50 text-blue-800 p-3 text-sm font-medium border-b border-blue-100 flex items-start gap-2">
                <MessageCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>
                  Antes de realizar el pago contáctate con la empresa para corroborar los
                  montos.
                </p>
              </div>
              <div className="p-4 bg-muted/10 space-y-3">
                <h5 className="font-semibold text-sm uppercase text-muted-foreground">
                  Métodos de Pago Disponibles
                </h5>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activePaymentMethods.map((pm) => (
                    <div key={pm.id} className="p-3 bg-card border rounded-md">
                      <p className="font-semibold text-sm">{pm.type}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                        {pm.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {order.status === "PENDING" && (
            <Button
              variant="secondary"
              onClick={onApplyDiscount}
              className="gap-2"
            >
              <Percent className="h-4 w-4" /> Aplicar Descuento
            </Button>
          )}
          <Button variant="outline" onClick={() => setReportDialogOpen(true)}>
            Denunciar Usuario
          </Button>
        </DialogFooter>
        {appUser && (
          <ReportUserDialog
            isOpen={isReportDialogOpen}
            onOpenChange={setReportDialogOpen}
            order={order}
            reporterId={appUser.id}
            onSuccess={() => {
              setReportDialogOpen(false);
              onReportSuccess();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-componente: Cambio de Estado ────────────────────────────────────────
function UpdateStatusSelect({
  storeId,
  order,
  onUpdate,
}: {
  storeId: string;
  order: Order;
  onUpdate: () => void;
}) {
  const currentStatus = order.status;
  const orderId = order.id;
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const isLocked =
    currentStatus === "RETURNED" ||
    currentStatus === "CANCELLED";

  const handleUpdate = async () => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("status", status);
    const result = await updateOrderStatus(storeId, orderId, formData);
    if (result.error)
      toast({ variant: "destructive", title: "Error", description: result.error });
    else {
      toast({ title: "Éxito", description: result.message });
      onUpdate();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        onValueChange={(v) => setStatus(v as OrderStatus)}
        disabled={isLocked}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Cambiar estado" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(statusTranslations) as OrderStatus[])
            .filter((s) => {
              // Si el pedido está pagado o reportado, NO permitir marcar como VENCIDO
              if (s === "EXPIRED_WARNING") {
                return order.payment_status !== "paid" && !order.paymentMessage;
              }
              return true;
            })
            .map((s) => (
              <SelectItem key={s} value={s}>
                {statusTranslations[s]}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleUpdate}
        disabled={isSubmitting || status === currentStatus || isLocked}
      >
        {isSubmitting ? "..." : "OK"}
      </Button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OrdersClient({ storeId }: OrdersClientProps) {
  const { data: orders, loading, error, refetch } = useFirestoreQuery<Order>("Orders", [
    where("storeId", "==", storeId),
  ]);
  const { data: store } = useDocument<Store>(`Stores/${storeId}`);

  // Módulo 2: Evaluación de expiración en memoria, sin queries extra
  useExpirationChecker(orders, storeId);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const [isExpiredDialogOpen, setExpiredDialogOpen] = useState(false);
  const [isConfigOpen, setConfigOpen] = useState(false);
  const { toast } = useToast();

  const [kpiFilter, setKpiFilter] = useState<ExtendedFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const expirationHours = (store?.reservationExpirationHours ?? 24) as 2 | 6 | 12 | 24;

  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return [];
    let list = [...orders];

    // Filtrar por KPI o estado
    if (kpiFilter === "PAYMENT_REPORTED") {
      list = list.filter((o) => ["PENDING", "CONFIRMED", "READY", "EXPIRED_WARNING"].includes(o.status) && !!o.paymentMessage);
    } else if (kpiFilter !== "ALL") {
      list = list.filter((o) => o.status === kpiFilter);
    }

    if (searchTerm.trim()) {
      list = list.filter((o) =>
        o.userName?.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
    }

    list.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [orders, kpiFilter, sortOrder, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, kpiFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedOrders.length / ITEMS_PER_PAGE)
  );
  const paginatedOrders = filteredAndSortedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };
  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };
  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setReceiptOpen(true);
  };
  const handleApplyDiscount = (order: Order) => {
    setSelectedOrder(order);
    setDiscountOpen(true);
  };
  const handleOpenExpired = (order: Order) => {
    setSelectedOrder(order);
    setExpiredDialogOpen(true);
  };

  const handleProcessReturn = async (order: Order) => {
    if (
      confirm(
        "¿Estás seguro de procesar esta devolución? El inventario será reintegrado y la venta será anulada."
      )
    ) {
      const formData = new FormData();
      formData.append("status", "RETURNED");
      const result = await updateOrderStatus(storeId, order.id, formData);
      if (result.error)
        toast({ variant: "destructive", title: "Error", description: result.error });
      else {
        toast({
          title: "Devolución Procesada",
          description: "Inventario reintegrado exitosamente.",
        });
        refetch();
      }
    }
  };

  const handleReportSuccess = () => {
    toast({
      title: "Denuncia Enviada",
      description: "Enviada al administrador para revisión.",
    });
  };

  const getWhatsAppLink = (phoneNumber: string, name: string, orderId: string) => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hola ${name}, te contacto de AkistApp referente a tu pedido #${orderId.substring(
        0,
        7
      )}. ¿Cómo coordinamos la entrega?`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <PageHeader
          title="Gestión de Pedidos"
          description="Administra los pedidos entrantes y procesa devoluciones."
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setConfigOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
          Configurar Órdenes
        </Button>
      </div>

      {/* Módulo 3.1: Barra de KPIs */}
      <OrderKpiBar
        orders={orders}
        activeFilter={kpiFilter}
        onFilterChange={setKpiFilter}
      />

      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
        <div className="relative flex-grow w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full sm:w-[300px]"
          />
        </div>
        {kpiFilter !== "ALL" && (
          <Badge
            variant="secondary"
            className="gap-1 cursor-pointer"
            onClick={() => setKpiFilter("ALL")}
          >
            Filtro activo: {kpiFilter === "PAYMENT_REPORTED" ? "Pago Reportado" : statusTranslations[kpiFilter as OrderStatus]}
            <span className="ml-1 text-muted-foreground">✕</span>
          </Badge>
        )}
      </div>

      {/* Tabla de órdenes */}
      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total Final</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="flex items-center gap-1.5">
                Gestión
                <HelpTip
                  text="Flujo de estados:\nPENDIENTE → CONFIRMADO → LISTO → ENTREGADO\nCambia el estado con el selector y pulsa OK para guardar.\nEl estado DEVUELTO solo se activa desde el menú ⋯."
                  side="bottom"
                />
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron pedidos.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => {
                const isExpired = order.status === "EXPIRED_WARNING";
                const hasPayment = !!order.paymentMessage && ["PENDING", "CONFIRMED", "READY", "EXPIRED_WARNING"].includes(order.status);

                // Módulo 3.2: clases CSS de resaltado
                const rowClass = cn(
                  order.status === "RETURNED" && "bg-muted/20 opacity-70",
                  isExpired && "bg-orange-50 border-l-4 border-l-orange-400",
                  hasPayment && "bg-emerald-50 border-l-4 border-l-emerald-400"
                );

                return (
                  <TableRow key={order.id} className={rowClass}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1 items-start">
                        <span>#{order.id.substring(0, 7)}</span>
                        {isExpired && (
                          <Badge
                            variant="outline"
                            className="px-1 py-0 text-[10px] bg-orange-100 text-orange-800 border-orange-300 whitespace-nowrap gap-1"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" /> Vencida
                          </Badge>
                        )}
                        {hasPayment && (
                          <Badge
                            variant="secondary"
                            className="px-1 py-0 text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap animate-pulse"
                          >
                            💳 Pago Reportado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>{order.userName || "N/A"}</TableCell>
                    <TableCell
                      className={cn(
                        "font-bold",
                        order.status === "RETURNED" && "line-through text-muted-foreground"
                      )}
                    >
                      $
                      {(
                        order.finalTotal || order.totalAmount + order.shippingCost
                      ).toFixed(2)}
                      {order.manualDiscount ? (
                        <span className="ml-1 text-[10px] text-destructive">
                          (-${order.manualDiscount})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${statusColors[order.status]}`}
                        />
                        {statusTranslations[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-orange-400 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleOpenExpired(order)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Gestionar Reserva
                        </Button>
                      ) : (
                        <div className="flex justify-end">
                          <UpdateStatusSelect
                            storeId={storeId}
                            order={order}
                            onUpdate={refetch}
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleViewDetails(order)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleViewReceipt(order)}>
                            <FileText className="mr-2 h-4 w-4" /> Ver Comprobante
                          </DropdownMenuItem>
                          {order.userPhoneNumber && (
                            <DropdownMenuItem asChild>
                              <a
                                href={getWhatsAppLink(
                                  order.userPhoneNumber,
                                  order.userName || "Cliente",
                                  order.id
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center"
                              >
                                <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                                WhatsApp
                              </a>
                            </DropdownMenuItem>
                          )}
                          {order.status === "PENDING" && (
                            <>
                              <DropdownMenuItem
                                onSelect={() => handleApplyDiscount(order)}
                              >
                                <Percent className="mr-2 h-4 w-4 text-primary" /> Aplicar
                                Descuento
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEdit(order)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar Items
                              </DropdownMenuItem>
                            </>
                          )}
                          {isExpired && (
                            <DropdownMenuItem
                              onSelect={() => handleOpenExpired(order)}
                              className="text-orange-600"
                            >
                              <AlertTriangle className="mr-2 h-4 w-4" /> Gestionar Vencida
                            </DropdownMenuItem>
                          )}
                          {order.status === "DELIVERED" && (
                            <DropdownMenuItem
                              onSelect={() => handleProcessReturn(order)}
                              className="text-orange-600"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" /> Procesar Devolución
                              <HelpTip
                                text="Revierte el inventario automáticamente.\nSolo disponible en pedidos ENTREGADOS.\nEsta acción es irreversible."
                                side="left"
                                className="ml-auto"
                              />
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
              <span className="ml-2 text-xs">
                ({(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedOrders.length)}{" "}
                de {filteredAndSortedOrders.length})
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <OrderDetailsDialog
        order={selectedOrder}
        store={store || null}
        open={isDetailsOpen}
        onOpenChange={setDetailsOpen}
        onReportSuccess={handleReportSuccess}
        onApplyDiscount={() => {
          setDetailsOpen(false);
          setDiscountOpen(true);
        }}
      />

      {selectedOrder && (
        <>
          <EditOrderDialog
            order={selectedOrder}
            storeId={storeId}
            open={isEditDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={() => {
              setEditDialogOpen(false);
              refetch();
            }}
          />
          <ManualDiscountDialog
            order={selectedOrder}
            storeId={storeId}
            open={isDiscountOpen}
            onOpenChange={setDiscountOpen}
            onSuccess={() => {
              setDiscountOpen(false);
              refetch();
            }}
          />
          <ExpiredOrderDialog
            order={selectedOrder}
            storeName={store?.name || "la tienda"}
            storeId={storeId}
            open={isExpiredDialogOpen}
            onOpenChange={setExpiredDialogOpen}
            onSuccess={() => {
              setExpiredDialogOpen(false);
              refetch();
            }}
          />
        </>
      )}

      <Dialog open={isReceiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-muted/30">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Comprobante de Pedido</DialogTitle>
            <DialogDescription>Vista para impresión.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto p-6">
            {selectedOrder && <OrderReceipt order={selectedOrder} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configuración de Órdenes (Módulo 2.1) */}
      <OrderConfigDialog
        storeId={storeId}
        currentHours={expirationHours}
        open={isConfigOpen}
        onOpenChange={setConfigOpen}
      />
    </>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
