
"use client";

import { useState } from "react";
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
import { MoreHorizontal, Eye, Edit } from "lucide-react";
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


function OrderDetailsDialog({ order, open, onOpenChange, onReportSuccess }: { order: Order | null; open: boolean; onOpenChange: (open: boolean) => void; onReportSuccess: () => void; }) {
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
                            {order.items.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell className="flex items-center gap-2">
                                        <Image src={getImageUrl(item.image, item.productId, 40, 40)} alt={item.productName || 'Imagen del producto'} width={40} height={40} className="rounded-md object-cover" />
                                        {item.productName}
                                    </TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
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
  const { toast } = useToast();

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  }

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
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
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron pedidos.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
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
    </>
  );
}
