"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { where } from 'firebase/firestore';
import type { StoreProduct } from '@/lib/types';
import { PageHeader } from '../ui/page-header';
import Loader from '../ui/loader';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, PlusCircle, MinusCircle, XCircle, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createManualSale } from '@/app/store/[storeId]/pos/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '../ui/label';

interface CartItem {
  inventoryId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
}

interface CustomerInfo {
  name: string;
  nationalId: string;
  phone: string;
}

function CustomerInfoDialog({ open, onOpenChange, onSave, initialData }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CustomerInfo) => void;
  initialData: CustomerInfo;
}) {
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData.name || '');
      setNationalId(initialData.nationalId || '');
      setPhone(initialData.phone || '');
    }
  }, [open, initialData]);

  const handleSave = () => {
      onSave({ name, nationalId, phone });
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Información del Cliente</DialogTitle>
                  <DialogDescription>
                      Introduce los datos del cliente para la factura. Todos los campos son opcionales.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">Nombre</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Nombre completo"/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="nationalId" className="text-right">Cédula/ID</Label>
                      <Input id="nationalId" value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="col-span-3" placeholder="V-12345678"/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">Teléfono</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" placeholder="0414-1234567"/>
                  </div>
              </div>
              <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" onClick={handleSave}>Guardar Cliente</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  );
}


export default function PosClient({ storeId }: { storeId: string }) {
  const { data: inventory, loading, error, refetch } = useFirestoreQuery<StoreProduct>('Inventory', [
    where('storeId', '==', storeId),
    where('isAvailable', '==', true),
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', nationalId: '', phone: '' });
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, searchTerm]);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const addToCart = (product: StoreProduct) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.inventoryId === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.currentStock) {
            return prevCart.map(item =>
                item.inventoryId === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
        }
        toast({ variant: 'destructive', title: 'Stock insuficiente' });
        return prevCart;
      }
      return [
        ...prevCart,
        {
          inventoryId: product.id,
          productId: product.productId,
          name: product.name,
          price: product.promotionalPrice || product.price,
          quantity: 1,
          image: getImageUrl(product.storeSpecificImage || product.globalImage, product.productId, 40, 40),
          stock: product.currentStock,
        },
      ];
    });
  };

  const updateQuantity = (inventoryId: string, newQuantity: number) => {
    setCart(prevCart => {
      const itemToUpdate = prevCart.find(item => item.inventoryId === inventoryId);
      if (!itemToUpdate) return prevCart;

      if (newQuantity <= 0) {
        return prevCart.filter(item => item.inventoryId !== inventoryId);
      }
      if (newQuantity > itemToUpdate.stock) {
        toast({ variant: 'destructive', title: 'Stock insuficiente' });
        return prevCart;
      }
      return prevCart.map(item =>
        item.inventoryId === inventoryId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
        toast({ variant: 'destructive', title: 'El carrito está vacío' });
        return;
    }
    setIsSubmitting(true);
    const saleItems = cart.map(item => ({
        inventoryId: item.inventoryId,
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
    }));
    
    const formData = new FormData();
    formData.append('items', JSON.stringify(saleItems));
    formData.append('totalAmount', String(cartTotal));
    formData.append('userName', customerInfo.name);
    formData.append('userNationalId', customerInfo.nationalId);
    formData.append('userPhoneNumber', customerInfo.phone);


    const result = await createManualSale(storeId, formData);

    if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Éxito', description: 'Venta registrada y stock actualizado.' });
        setCart([]);
        setCustomerInfo({ name: '', nationalId: '', phone: '' }); // Reset customer info
        refetch(); // Refresca el inventario para mostrar el nuevo stock
    }
    setIsSubmitting(false);
  };


  if (loading) return <Loader text="Cargando punto de venta..." />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="Punto de Venta" description="Registra ventas manuales en tu tienda." />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Productos Disponibles</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar producto por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="flex items-center gap-2">
                                            <Image src={getImageUrl(p.storeSpecificImage || p.globalImage, p.productId, 40, 40)} alt={p.name} width={40} height={40} className="rounded-md object-cover" />
                                            {p.name}
                                        </TableCell>
                                        <TableCell>{p.currentStock}</TableCell>
                                        <TableCell>${(p.promotionalPrice || p.price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => addToCart(p)} disabled={p.currentStock <= 0}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Añadir
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShoppingCart /> Carrito de Venta</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <ScrollArea className="h-[40vh] pr-4">
                        {cart.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">El carrito está vacío.</p>
                        ) : (
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <div key={item.inventoryId} className="flex items-start gap-3">
                                        <Image src={item.image} alt={item.name} width={48} height={48} className="rounded-md" />
                                        <div className="flex-grow">
                                            <p className="font-medium text-sm leading-tight">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.inventoryId, item.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                                <Input type="number" value={item.quantity} onChange={e => updateQuantity(item.inventoryId, parseInt(e.target.value) || 0)} className="h-8 w-14 text-center p-1" />
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.inventoryId, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                        <p className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
                 <div className="p-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium">Información del Cliente</h4>
                        {customerInfo.name && (
                            <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setCustomerInfo({ name: '', nationalId: '', phone: '' })}>
                                Limpiar
                            </Button>
                        )}
                    </div>
                    
                    {customerInfo.name ? (
                        <div className="text-sm text-muted-foreground space-y-1 p-2 bg-muted/50 rounded-md">
                            <p><span className="font-semibold text-foreground">Nombre:</span> {customerInfo.name}</p>
                            {customerInfo.nationalId && <p><span className="font-semibold text-foreground">Cédula:</span> {customerInfo.nationalId}</p>}
                            {customerInfo.phone && <p><span className="font-semibold text-foreground">Teléfono:</span> {customerInfo.phone}</p>}
                            <Button variant="link" className="p-0 h-auto text-xs mt-1" onClick={() => setCustomerDialogOpen(true)}>
                                Editar
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full" onClick={() => setCustomerDialogOpen(true)}>
                            Añadir Cliente (Opcional)
                        </Button>
                    )}
                </div>
                <CardFooter className="flex-col gap-4 !p-4 mt-auto">
                    <div className="w-full flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <Button className="w-full" onClick={handleCompleteSale} disabled={isSubmitting || cart.length === 0}>
                        {isSubmitting ? "Registrando Venta..." : "Completar Venta"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
       <CustomerInfoDialog
            open={isCustomerDialogOpen}
            onOpenChange={setCustomerDialogOpen}
            onSave={(data) => {
                setCustomerInfo(data);
                setCustomerDialogOpen(false);
            }}
            initialData={customerInfo}
        />
    </>
  );
}
