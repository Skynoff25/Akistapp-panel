"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import type { Order, CartItemSnapshot } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateOrderItems } from '@/app/store/[storeId]/orders/actions';
import { ScrollArea } from '../ui/scroll-area';

interface EditOrderDialogProps {
  order: Order;
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditOrderDialog({ order, storeId, open, onOpenChange, onSuccess }: EditOrderDialogProps) {
  const [items, setItems] = useState<CartItemSnapshot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (order) {
      setItems(JSON.parse(JSON.stringify(order.items))); // Deep copy
    }
  }, [order]);

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const handleQuantityChange = (uniqueId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity); // No permitir cantidades negativas
    setItems(currentItems =>
      currentItems.map(item => {
        const itemUniqueId = item.variantId ? `${item.inventoryId}-${item.variantId}` : item.inventoryId;
        return itemUniqueId === uniqueId ? { ...item, quantity: newQuantity } : item;
      })
    );
  };

  const handleRemoveItem = (uniqueId: string) => {
    setItems(currentItems => currentItems.filter(item => {
        const itemUniqueId = item.variantId ? `${item.inventoryId}-${item.variantId}` : item.inventoryId;
        return itemUniqueId !== uniqueId;
    }));
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const finalItems = items.filter(item => item.quantity > 0); // Eliminar artículos con cantidad 0
    
    const formData = new FormData();
    formData.append('items', JSON.stringify(finalItems));
    
    const result = await updateOrderItems(storeId, order.id, formData);

    if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Éxito', description: result.message });
        onSuccess();
    }
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Pedido #{order.id.substring(0, 7)}</DialogTitle>
          <DialogDescription>
            Modifica las cantidades o elimina artículos del pedido. Los cambios se guardarán permanentemente.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <ScrollArea className="h-[50vh] pr-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-[120px]">Cantidad</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(item => {
                      const uniqueId = item.variantId ? `${item.inventoryId}-${item.variantId}` : item.inventoryId;
                      return (
                        <TableRow key={uniqueId}>
                            <TableCell className="flex items-center gap-2">
                                <Image src={getImageUrl(item.image, item.productId, 40, 40)} alt={item.productName} width={40} height={40} className="rounded-md" />
                                <div>
                                    <p className="font-medium">{item.productName}</p>
                                    {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Input 
                                    type="number" 
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(uniqueId, parseInt(e.target.value))}
                                    className="h-9 w-24 text-center"
                                    min="0"
                                />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                ${(item.price * item.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveItem(uniqueId)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
            </Table>
            </ScrollArea>
        </div>
        <DialogFooter className="pr-4">
            <div className="flex justify-between items-center w-full">
                <div className="text-lg font-bold">
                    Nuevo Total: ${total.toFixed(2)}
                </div>
                <div>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
