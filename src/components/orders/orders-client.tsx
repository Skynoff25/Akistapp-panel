"use client";

import { useState, useMemo, useEffect } from "react";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { useDocument } from "@/hooks/use-document";
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
import { MoreHorizontal, Eye, Edit, Search, FileText, MessageCircle, Percent, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
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
import { es } from 'date-fns/locale';
import Image from "next/image";
import { updateOrderStatus, applyManualDiscount } from "@/app/store/[storeId]/orders/actions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { ReportUserDialog } from "../reports/report-user-dialog";
import { getImageUrl } from "@/lib/utils";
import { EditOrderDialog } from "./edit-order-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { OrderReceipt } from "./order-receipt";

interface OrdersClientProps {
  storeId: string;
}

const statusTranslations: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  READY: "Listo para Recoger/Enviar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  RETURNED: "Devuelto (Stock Reintegrado)",
};

const statusColors: Record<OrderStatus, string> = {
    PENDING: "bg-yellow-500",
    CONFIRMED: "bg-blue-500",
    READY: "bg-purple-500",
    DELIVERED: "bg-green-500",
    CANCELLED: "bg-red-500",
    RETURNED: "bg-gray-500",
};

function ManualDiscountDialog({ order, storeId, open, onOpenChange, onSuccess }: {
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
        if (res.error) toast({ variant: 'destructive', title: 'Error', description: res.error });
        else {
            toast({ title: 'Descuento aplicado' });
            onSuccess();
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Aplicar Descuento Manual</DialogTitle>
                    <DialogDescription>Resta un monto fijo al total del pedido antes de despachar.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Monto a descontar ($)</Label>
                        <Input type="number" step="0.01" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="p-3 bg-muted rounded-md text-sm">
                        <div className="flex justify-between"><span>Subtotal:</span> <span>${(order.totalAmount + order.shippingCost).toFixed(2)}</span></div>
                        <div className="flex justify-between text-destructive font-bold"><span>Descuento:</span> <span>-${discount.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t mt-2 pt-2 font-bold text-lg">
                            <span>Total Estimado:</span>
                            <span>${Math.max(0, (order.totalAmount + order.shippingCost) - (order.couponDiscount || 0) - discount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleApply} disabled={isSubmitting}>Aplicar Descuento</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function OrderDetailsDialog({ 
    order, 
    store,
    open, 
    onOpenChange, 
    onReportSuccess,
    onApplyDiscount
}: { 
    order: Order | null; 
    store: Store | null;
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    onReportSuccess: () => void;
    onApplyDiscount: () => void;
}) {
    if (!order) return null;
    const { appUser } = useAuth();
    const [isReportDialogOpen, setReportDialogOpen] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    const activePaymentMethods = store?.paymentMethods?.filter(pm => pm.isActive) || [];
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Detalles del Pedido #{order.id.substring(0, 7)}</DialogTitle>
                    <DialogDescription>
                       Realizado el {format(new Date(order.createdAt), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="font-semibold">Cliente:</span> {order.userName || 'N/A'}</div>
                        <div><span className="font-semibold">Email:</span> {order.userEmail || 'N/A'}</div>
                        <div><span className="font-semibold">Teléfono:</span> {order.userPhoneNumber || 'N/A'}</div>
                        <div><span className="font-semibold">Método:</span> {order.deliveryMethod === 'PICKUP' ? 'Recoger en tienda' : 'Envío a domicilio'}</div>
                        <div><span className="font-semibold">Estado:</span> <span className="font-medium text-primary">{statusTranslations[order.status]}</span></div>
                    </div>
                    {order.deliveryMethod === 'DELIVERY' && <div><span className="font-semibold">Dirección:</span> {order.deliveryAddress}</div>}
                    {order.comments && <div><span className="font-semibold">Comentarios:</span> {order.comments}</div>}

                    {order.paymentMessage && (
                        <div className="mt-2 p-3 bg-green-50 text-green-800 border-l-4 border-green-500 rounded-md">
                            <p className="font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Pago Reportado por Cliente
                            </p>
                            <p className="text-sm mt-1"><span className="font-medium">Referencia/Mensaje:</span> {order.paymentMessage}</p>
                            {order.paymentMethod && (
                                <p className="text-sm"><span className="font-medium">Método seleccionado:</span> {order.paymentMethod.type}</p>
                            )}
                        </div>
                    )}
                    
                    <div className="mt-4 border rounded-md border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => setShowProducts(!showProducts)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 text-slate-900 font-bold text-sm rounded-t-md"
                      >
                        <span>Artículos del Pedido ({order.items.length})</span>
                        <span className="text-slate-500">{showProducts ? '▲ Ocultar' : '▼ Ver lista'}</span>
                      </button>
                      <div className={`overflow-x-auto border-t ${showProducts ? 'block' : 'hidden'}`}>
                        <Table className="min-w-[500px]">
                            <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">Precio Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {order.items.map((item, index) => {
                                    const uniqueKey = item.variantId ? `${item.inventoryId}-${item.variantId}` : item.inventoryId;
                                    return (
                                    <TableRow key={`${uniqueKey}-${index}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Image src={getImageUrl(item.image, item.productId, 40, 40)} alt={item.productName} width={40} height={40} className="rounded-md object-cover flex-shrink-0" />
                                                <div className="min-w-[120px]"><p className="font-medium line-clamp-2">{item.productName}</p>{item.variantName && <p className="text-sm text-muted-foreground line-clamp-1">{item.variantName}</p>}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">${item.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                      </div>
                    </div>
                    <div className="grid justify-end gap-2 text-right mt-4 bg-muted/30 p-4 rounded-lg">
                        <div><span className="text-muted-foreground">Subtotal:</span> ${order.totalAmount.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Costo de envío:</span> ${order.shippingCost.toFixed(2)}</div>
                        {order.couponCode && <div className="text-primary"><span className="font-semibold">Cupón ({order.couponCode}):</span> -${(order.couponDiscount || 0).toFixed(2)}</div>}
                        {order.manualDiscount && order.manualDiscount > 0 && <div className="text-destructive"><span className="font-semibold">Descuento Manual:</span> -${order.manualDiscount.toFixed(2)}</div>}
                        <div className="text-xl font-bold pt-2 border-t"><span className="mr-2">TOTAL FINAL:</span> ${order.finalTotal?.toFixed(2) || (order.totalAmount + order.shippingCost).toFixed(2)}</div>
                    </div>

                    {order.status === 'PENDING' && activePaymentMethods.length > 0 && (
                        <div className="mt-4 border rounded-lg overflow-hidden">
                            <div className="bg-blue-50 text-blue-800 p-3 text-sm font-medium border-b border-blue-100 flex items-start gap-2">
                                <MessageCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                <p>Antes de realizar el pago contáctate con la empresa para corroborar los montos.</p>
                            </div>
                            <div className="p-4 bg-muted/10 space-y-3">
                                <h5 className="font-semibold text-sm uppercase text-muted-foreground">Métodos de Pago Disponibles</h5>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {activePaymentMethods.map(pm => (
                                        <div key={pm.id} className="p-3 bg-card border rounded-md">
                                            <p className="font-semibold text-sm">{pm.type}</p>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{pm.details}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <DialogFooter className="flex-col sm:flex-row gap-2">
                    {order.status === 'PENDING' && (
                        <Button variant="secondary" onClick={onApplyDiscount} className="gap-2">
                            <Percent className="h-4 w-4" /> Aplicar Descuento
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setReportDialogOpen(true)}>Denunciar Usuario</Button>
                </DialogFooter>
                {appUser && (
                     <ReportUserDialog
                        isOpen={isReportDialogOpen}
                        onOpenChange={setReportDialogOpen}
                        order={order}
                        reporterId={appUser.id}
                        onSuccess={() => { setReportDialogOpen(false); onReportSuccess(); }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function UpdateStatusSelect({ storeId, orderId, currentStatus, onUpdate }: { storeId: string, orderId: string, currentStatus: OrderStatus, onUpdate: () => void }) {
    const [status, setStatus] = useState<OrderStatus>(currentStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setStatus(currentStatus);
    }, [currentStatus]);

    const handleUpdate = async () => {
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('status', status);
        const result = await updateOrderStatus(storeId, orderId, formData);
        if (result.error) toast({ variant: 'destructive', title: 'Error', description: result.error });
        else {
             toast({ title: 'Éxito', description: result.message });
             onUpdate();
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)} disabled={currentStatus === 'RETURNED' || currentStatus === 'CANCELLED'}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cambiar estado" /></SelectTrigger>
                <SelectContent>{Object.keys(statusTranslations).map(s => (<SelectItem key={s} value={s}>{statusTranslations[s as OrderStatus]}</SelectItem>))}</SelectContent>
            </Select>
            <Button onClick={handleUpdate} disabled={isSubmitting || status === currentStatus || currentStatus === 'RETURNED' || currentStatus === 'CANCELLED'}>{isSubmitting ? '...' : 'OK'}</Button>
        </div>
    );
}


export default function OrdersClient({ storeId }: OrdersClientProps) {
  const { data: orders, loading, error, refetch } = useFirestoreQuery<Order>("Orders", [
    where("storeId", "==", storeId),
  ]);
  const { data: store } = useDocument<Store>(`Stores/${storeId}`);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const { toast } = useToast();

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return [];
    let processedOrders = [...orders];
    if (statusFilter !== 'ALL') processedOrders = processedOrders.filter(order => order.status === statusFilter);
    if (searchTerm.trim()) processedOrders = processedOrders.filter(order => order.userName?.toLowerCase().includes(searchTerm.toLowerCase().trim()));
    processedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    return processedOrders;
  }, [orders, sortOrder, statusFilter, searchTerm]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredAndSortedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewDetails = (order: Order) => { setSelectedOrder(order); setDetailsOpen(true); }
  const handleEdit = (order: Order) => { setSelectedOrder(order); setEditDialogOpen(true); };
  const handleViewReceipt = (order: Order) => { setSelectedOrder(order); setReceiptOpen(true); };
  const handleApplyDiscount = (order: Order) => { setSelectedOrder(order); setDiscountOpen(true); };
  
  const handleProcessReturn = async (order: Order) => {
    if (confirm("¿Estás seguro de procesar esta devolución? El inventario será reintegrado y la venta será anulada.")) {
        const formData = new FormData();
        formData.append('status', 'RETURNED');
        const result = await updateOrderStatus(storeId, order.id, formData);
        if (result.error) toast({ variant: 'destructive', title: 'Error', description: result.error });
        else {
            toast({ title: 'Devolución Procesada', description: 'Inventario reintegrado exitosamente.' });
            refetch();
        }
    }
  };

  const handleReportSuccess = () => {
    toast({ title: "Denuncia Enviada", description: "Enviada al administrador para revisión." });
  };

  const getWhatsAppLink = (phoneNumber: string, name: string, orderId: string) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${name}, te contacto de AkistApp referente a tu pedido #${orderId.substring(0, 7)}. ¿Cómo coordinamos la entrega?`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="Gestión de Pedidos" description="Administra los pedidos entrantes y procesa devoluciones." />

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
        <div className="relative flex-grow w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full sm:w-[300px]" />
        </div>
        <div className="flex items-center gap-2">
            <Label htmlFor="status-filter">Estado:</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger id="status-filter" className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ALL">Todos</SelectItem>{Object.keys(statusTranslations).map(s => (<SelectItem key={s} value={s}>{statusTranslations[s as OrderStatus]}</SelectItem>))}</SelectContent>
            </Select>
        </div>
      </div>

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
                  text="Flujo de estados:\nPENDIENTE → CONFIRMADO → LISTO → ENTREGADO\nCambia el estado con el selector y pulsa OK para guardar.\nEl estado DEVUELTO solo se activa desde el menú \u22EE."
                  side="bottom"
                />
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron pedidos.</TableCell></TableRow>
            ) : (
              paginatedOrders.map((order) => (
                <TableRow key={order.id} className={order.status === 'RETURNED' ? 'bg-muted/20' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1 items-start">
                      <span>#{order.id.substring(0, 7)}</span>
                      {order.paymentMessage && (
                        <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-green-100 hover:bg-green-200 text-green-800 border-green-200 whitespace-nowrap">
                          Pago Reportado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(order.createdAt), 'dd/MM/yy')}</TableCell>
                  <TableCell>{order.userName || 'N/A'}</TableCell>
                  <TableCell className={cn("font-bold", order.status === 'RETURNED' && "line-through text-muted-foreground")}>
                    ${(order.finalTotal || (order.totalAmount + order.shippingCost)).toFixed(2)}
                    {order.manualDiscount ? <span className="ml-1 text-[10px] text-destructive">(-${order.manualDiscount})</span> : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusColors[order.status]}`}></span>
                        {statusTranslations[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell><UpdateStatusSelect storeId={storeId} orderId={order.id} currentStatus={order.status} onUpdate={refetch} /></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleViewDetails(order)}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleViewReceipt(order)}><FileText className="mr-2 h-4 w-4" /> Ver Comprobante</DropdownMenuItem>
                            {order.userPhoneNumber && (
                                <DropdownMenuItem asChild>
                                    <a href={getWhatsAppLink(order.userPhoneNumber, order.userName || 'Cliente', order.id)} target="_blank" rel="noopener noreferrer" className="flex w-full items-center"><MessageCircle className="mr-2 h-4 w-4 text-green-600" /> WhatsApp</a>
                                </DropdownMenuItem>
                            )}
                            {order.status === 'PENDING' && (
                                <>
                                    <DropdownMenuItem onSelect={() => handleApplyDiscount(order)}><Percent className="mr-2 h-4 w-4 text-primary" /> Aplicar Descuento</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleEdit(order)}><Edit className="mr-2 h-4 w-4" /> Editar Items</DropdownMenuItem>
                                </>
                            )}
                            {order.status === 'DELIVERED' && (
                                <DropdownMenuItem onSelect={() => handleProcessReturn(order)} className="text-orange-600">
                                    <RotateCcw className="mr-2 h-4 w-4" /> Procesar Devolución
                                    <HelpTip text="Revierte el inventario automáticamente.\nSolo disponible en pedidos ENTREGADOS.\nEsta acción es irreversible." side="left" className="ml-auto" />
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
              <span className="ml-2 text-xs">
                ({(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedOrders.length)} de {filteredAndSortedOrders.length})
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <OrderDetailsDialog 
        order={selectedOrder} 
        store={store || null}
        open={isDetailsOpen} 
        onOpenChange={setDetailsOpen} 
        onReportSuccess={handleReportSuccess} 
        onApplyDiscount={() => { setDetailsOpen(false); setDiscountOpen(true); }}
      />
      
      {selectedOrder && (
        <>
            <EditOrderDialog order={selectedOrder} storeId={storeId} open={isEditDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={() => { setEditDialogOpen(false); refetch(); }} />
            <ManualDiscountDialog order={selectedOrder} storeId={storeId} open={isDiscountOpen} onOpenChange={setDiscountOpen} onSuccess={() => { setDiscountOpen(false); refetch(); }} />
        </>
      )}

      <Dialog open={isReceiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-muted/30">
            <DialogHeader className="p-6 pb-0"><DialogTitle>Comprobante de Pedido</DialogTitle><DialogDescription>Vista para impresión.</DialogDescription></DialogHeader>
            <div className="max-h-[80vh] overflow-y-auto p-6">{selectedOrder && <OrderReceipt order={selectedOrder} />}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
