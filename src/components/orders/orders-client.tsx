
"use client";

import { useState, useMemo } from "react";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { where } from "firebase/firestore";
import type { Order, OrderStatus } from "@/lib/types";
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
import { MoreHorizontal, Eye, Edit, Search, FileText } from "lucide-react";
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
import { updateOrderStatus } from "@/app/store/[storeId]/orders/actions";
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
};

const statusColors: Record<OrderStatus, string> = {
    PENDING: "bg-yellow-500",
    CONFIRMED: "bg-blue-500",
    READY: "bg-purple-500",
    DELIVERED: "bg-green-500",
    CANCELLED: "bg-red-500",
};


function OrderDetailsDialog({ 
    order, 
    open, 
    onOpenChange, 
    onReportSuccess 
}: { 
    order: Order | null; 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    onReportSuccess: () => void; 
}) {
    if (!order) return null;
    const { appUser } = useAuth();
    const [isReportDialogOpen, setReportDialogOpen] = useState(false);
    
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
                    
                    <h4 className="font-semibold mt-4">Artículos del Pedido</h4>
                    <Table>
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
                                const uniqueKey = item.variantId ? `${item.inventoryId}-${item.variantId}` : item.inventoryId;
                                return (
                                <TableRow key={`${uniqueKey}-${index}`}>
                                    <TableCell className="flex items-center gap-2">
                                        <Image src={getImageUrl(item.image, item.productId, 40, 40)} alt={item.productName || 'Imagen del producto'} width={40} height={40} className="rounded-md object-cover" />
                                        <div>
                                            <p className="font-medium">{item.productName}</p>
                                            {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    <div className="grid justify-end gap-2 text-right mt-4">
                        <div><span className="font-semibold">Subtotal:</span> ${order.totalAmount.toFixed(2)}</div>
                        <div><span className="font-semibold">Costo de envío:</span> ${order.shippingCost.toFixed(2)}</div>
                        <div className="text-lg font-bold"><span className="font-semibold">Total:</span> ${(order.totalAmount + order.shippingCost).toFixed(2)}</div>
                    </div>
                </div>
                 <DialogFooter>
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

function UpdateStatusSelect({ storeId, orderId, currentStatus, onUpdate }: { storeId: string, orderId: string, currentStatus: OrderStatus, onUpdate: () => void }) {
    const [status, setStatus] = useState<OrderStatus>(currentStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleUpdate = async () => {
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('status', status);

        const result = await updateOrderStatus(storeId, orderId, formData);
        
        if (result.error) {
             toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
             toast({ title: 'Éxito', description: result.message });
             onUpdate();
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)} disabled={currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED'}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Cambiar estado" />
                </SelectTrigger>
                <SelectContent>
                    {Object.keys(statusTranslations).map(s => (
                        <SelectItem key={s} value={s}>{statusTranslations[s as OrderStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button onClick={handleUpdate} disabled={isSubmitting || status === currentStatus}>
                {isSubmitting ? 'Actualizando...' : 'Actualizar'}
            </Button>
        </div>
    );
}


export default function OrdersClient({ storeId }: OrdersClientProps) {
  const { data: orders, loading, error, refetch } = useFirestoreQuery<Order>("Orders", [
    where("storeId", "==", storeId),
  ]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const { toast } = useToast();

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return [];
    
    let processedOrders = [...orders];

    if (statusFilter !== 'ALL') {
        processedOrders = processedOrders.filter(order => order.status === statusFilter);
    }

    if (searchTerm.trim()) {
        processedOrders = processedOrders.filter(order => 
            order.userName?.toLowerCase().includes(searchTerm.toLowerCase().trim())
        );
    }

    processedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return processedOrders;
  }, [orders, sortOrder, statusFilter, searchTerm]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  }

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setReceiptOpen(true);
  };
  
  const handleReportSuccess = () => {
    toast({
        title: "Denuncia Enviada",
        description: "Tu denuncia ha sido enviada al administrador para su revisión.",
    });
  };

  if (loading) return <Loader className="h-[50vh]" text="Cargando pedidos..." />;
  if (error)
    return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader
        title="Gestión de Pedidos"
        description="Administra los pedidos entrantes de tu tienda."
      />

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
        <div className="relative flex-grow w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por nombre de cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
            />
        </div>
        <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="text-sm font-medium">Estado:</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger id="status-filter" className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {Object.keys(statusTranslations).map(s => (
                        <SelectItem key={s} value={s}>{statusTranslations[s as OrderStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-2">
            <Label htmlFor="sort-filter" className="text-sm font-medium">Ordenar:</Label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                <SelectTrigger id="sort-filter" className="w-[180px]">
                    <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="desc">Más Recientes</SelectItem>
                    <SelectItem value="asc">Más Antiguos</SelectItem>
                </SelectContent>
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
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Gestión de Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron pedidos con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id.substring(0, 7)}</TableCell>
                  <TableCell>{format(new Date(order.createdAt), 'dd/MM/yy')}</TableCell>
                  <TableCell>{order.userName || 'N/A'}</TableCell>
                  <TableCell>${(order.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusColors[order.status]}`}></span>
                        {statusTranslations[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <UpdateStatusSelect storeId={storeId} orderId={order.id} currentStatus={order.status} onUpdate={refetch} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleViewDetails(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>Ver Detalles</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleViewReceipt(order)}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Ver Comprobante</span>
                            </DropdownMenuItem>
                            {order.status === 'PENDING' && (
                                <DropdownMenuItem onSelect={() => handleEdit(order)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Editar Pedido</span>
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
      </div>

      <OrderDetailsDialog order={selectedOrder} open={isDetailsOpen} onOpenChange={setDetailsOpen} onReportSuccess={handleReportSuccess} />
      
      {selectedOrder && (
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
      )}

      <Dialog open={isReceiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-muted/30">
            <div className="max-h-[90vh] overflow-y-auto p-6">
                {selectedOrder && <OrderReceipt order={selectedOrder} />}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
