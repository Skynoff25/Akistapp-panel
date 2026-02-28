
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { useDocument } from '@/hooks/use-document';
import { where, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StoreProduct, ProductVariant, GlobalRates, Store, Order } from '@/lib/types';
import { PageHeader } from '../ui/page-header';
import Loader from '../ui/loader';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, PlusCircle, MinusCircle, XCircle, ShoppingCart, RefreshCw, FileCheck } from 'lucide-react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createManualSale } from '@/app/store/[storeId]/pos/actions';
import { updateStoreParallelRate, fetchBcvRate } from '@/app/dashboard/rates-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '../ui/label';
import { OrderReceipt } from '../orders/order-receipt';

interface CartItem {
  cartItemId: string; 
  inventoryId: string;
  productId: string;
  name: string;
  productName: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
  costPriceUsd: number;
  variantId?: string;
  variantName?: string;
}

interface CustomerInfo {
  name: string;
  nationalId: string;
  phone: string;
}

function SelectVariantDialog({
  product,
  open,
  onOpenChange,
  onSelectVariant,
}: {
  product: StoreProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVariant: (variant: ProductVariant) => void;
}) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleccionar Opción para {product.name}</DialogTitle>
          <DialogDescription>
            Elige una de las variantes disponibles para agregar al carrito.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {(product.variants || []).map((variant) => (
            <Button
              key={variant.id}
              variant="outline"
              className="w-full justify-between h-auto py-3"
              disabled={variant.stock <= 0}
              onClick={() => onSelectVariant(variant)}
            >
              <div className="text-left">
                <p className="font-semibold">{variant.name}</p>
                <p className="text-sm text-muted-foreground">{variant.stock} en stock</p>
              </div>
              <p className="text-lg font-bold">${variant.price.toFixed(2)}</p>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const { toast } = useToast();
  const { data: globalRates, loading: ratesLoading } = useDocument<GlobalRates>("Config/rates");
  const { data: store, loading: storeLoading } = useDocument<Store>(`Stores/${storeId}`);
  
  const { data: inventory, loading, error, refetch } = useFirestoreQuery<StoreProduct>('Inventory', [
    where('storeId', '==', storeId),
    where('isAvailable', '==', true),
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', nationalId: '', phone: '' });
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  
  const [localTasaOficial, setLocalTasaOficial] = useState(36.5);
  const [localTasaParalela, setLocalTasaParalela] = useState(40);
  const [isSyncing, setIsSyncing] = useState(false);
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<StoreProduct | null>(null);
  
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isReceiptDialogOpen, setReceiptDialogOpen] = useState(false);

  useEffect(() => {
    if (globalRates) {
        setLocalTasaOficial(globalRates.tasaOficial);
    }
    if (store?.tasaParalela) {
        setLocalTasaParalela(store.tasaParalela);
    } else if (globalRates?.tasaParalela) {
        setLocalTasaParalela(globalRates.tasaParalela);
    }
  }, [globalRates, store]);

  const handleParaleloChange = async (val: string) => {
    const num = parseFloat(val) || 0;
    setLocalTasaParalela(num);
    if (num > 0) {
        await updateStoreParallelRate(storeId, num);
    }
  };

  const handleSyncBCV = async () => {
    setIsSyncing(true);
    const result = await fetchBcvRate(storeId);
    if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Tasas Sincronizadas', description: 'BCV actualizado y tu paralelo ajustado al +10%.' });
    }
    setIsSyncing(false);
  };

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, searchTerm]);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const addBaseProductToCart = (product: StoreProduct) => {
    setCart(prevCart => {
      const cartItemId = product.id;
      const existingItem = prevCart.find(item => item.cartItemId === cartItemId);
      if (existingItem) {
        if (existingItem.quantity < product.currentStock) {
          return prevCart.map(item =>
            item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        toast({ variant: 'destructive', title: 'Stock insuficiente' });
        return prevCart;
      }
      return [
        ...prevCart,
        {
          cartItemId: product.id,
          inventoryId: product.id,
          productId: product.productId,
          name: product.name,
          productName: product.name,
          price: product.promotionalPrice || product.price,
          quantity: 1,
          image: getImageUrl(product.storeSpecificImage || product.globalImage, product.productId, 40, 40),
          stock: product.currentStock,
          costPriceUsd: product.costPriceUsd || 0,
        },
      ];
    });
  };

  const addVariantToCart = (product: StoreProduct, variant: ProductVariant) => {
    setCart(prevCart => {
      const cartItemId = `${product.id}-${variant.id}`;
      const existingItem = prevCart.find(item => item.cartItemId === cartItemId);
      if (existingItem) {
        if (existingItem.quantity < variant.stock) {
          return prevCart.map(item =>
            item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        toast({ variant: 'destructive', title: 'Stock insuficiente para esta variante' });
        return prevCart;
      }
      return [
        ...prevCart,
        {
          cartItemId: cartItemId,
          inventoryId: product.id,
          productId: product.productId,
          name: `${product.name} (${variant.name})`,
          productName: product.name,
          price: variant.price,
          quantity: 1,
          image: getImageUrl(product.storeSpecificImage || product.globalImage, product.productId, 40, 40),
          stock: variant.stock,
          costPriceUsd: product.costPriceUsd || 0,
          variantId: variant.id,
          variantName: variant.name,
        },
      ];
    });
  };

  const handleProductClick = (product: StoreProduct) => {
    if (product.hasVariations && product.variants?.length > 0) {
        setVariantSelectionProduct(product);
    } else if (!product.hasVariations) {
        addBaseProductToCart(product);
    } else {
        toast({ variant: 'destructive', title: 'Producto sin opciones', description: 'Este producto está marcado con variaciones pero no tiene ninguna configurada.' });
    }
  };


  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    setCart(prevCart => {
      const itemToUpdate = prevCart.find(item => item.cartItemId === cartItemId);
      if (!itemToUpdate) return prevCart;

      if (newQuantity <= 0) {
        return prevCart.filter(item => item.cartItemId !== cartItemId);
      }
      if (newQuantity > itemToUpdate.stock) {
        toast({ variant: 'destructive', title: 'Stock insuficiente' });
        return prevCart;
      }
      return prevCart.map(item =>
        item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
        toast({ variant: 'destructive', title: 'El carrito está vacío' });
        return;
    }
     if (localTasaOficial <= 0 || localTasaParalela <= 0) {
        toast({ variant: 'destructive', title: 'Tasas inválidas', description: 'Por favor, introduce tasas de cambio válidas.' });
        return;
    }
    setIsSubmitting(true);
    const saleItems = cart.map(item => ({
        inventoryId: item.inventoryId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        costPriceUsd: item.costPriceUsd,
        variantId: item.variantId,
        variantName: item.variantName,
    }));
    
    const formData = new FormData();
    formData.append('items', JSON.stringify(saleItems));
    formData.append('totalAmount', String(cartTotal));
    formData.append('userName', customerInfo.name);
    formData.append('userNationalId', customerInfo.nationalId);
    formData.append('userPhoneNumber', customerInfo.phone);
    formData.append('tasaOficial', String(localTasaOficial));
    formData.append('tasaParalela', String(localTasaParalela));


    const result = await createManualSale(storeId, formData);

    if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Éxito', description: 'Venta registrada y stock actualizado.' });
        
        // Fetch last order to show receipt
        try {
            const q = query(
                collection(db, "Orders"), 
                where("storeId", "==", storeId),
                where("userId", "==", "IN_STORE_SALE"),
                orderBy("createdAt", "desc"),
                limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                setLastOrder({ id: snap.docs[0].id, ...snap.docs[0].data() } as Order);
                setReceiptDialogOpen(true);
            }
        } catch (e) {
            console.error("Error fetching last order for receipt:", e);
        }

        setCart([]);
        setCustomerInfo({ name: '', nationalId: '', phone: '' }); 
        refetch();
    }
    setIsSubmitting(false);
  };


  if (loading || ratesLoading || storeLoading) return <Loader text="Cargando punto de venta..." />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="Punto de Venta" description="Registra ventas manuales en tu tienda." />
      
      <Card className="mb-8 border-primary/20">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Configuración de Tasas</CardTitle>
                    <CardDescription>La oficial es global. El paralelo es exclusivo de tu tienda.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleSyncBCV} disabled={isSyncing}>
                    {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Actualizar BCV
                </Button>
            </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="tasa-oficial-pos">Tasa Oficial (BCV) - Global</Label>
                <Input id="tasa-oficial-pos" type="number" value={localTasaOficial} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tasa-paralela-pos">Tasa de Reposición (Paralelo) - Tu Tienda</Label>
                <Input id="tasa-paralela-pos" type="number" value={localTasaParalela} onChange={e => handleParaleloChange(e.target.value)} placeholder="40.00"/>
            </div>
        </CardContent>
      </Card>
      
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
                                        <TableCell>{p.priceRange ? p.priceRange : `$${(p.promotionalPrice || p.price).toFixed(2)}`}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleProductClick(p)} disabled={p.currentStock <= 0}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                {p.hasVariations ? 'Opciones' : 'Añadir'}
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
                                    <div key={item.cartItemId} className="flex items-start gap-3">
                                        <Image src={item.image} alt={item.name} width={48} height={48} className="rounded-md" />
                                        <div className="flex-grow">
                                            <p className="font-medium text-sm leading-tight">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                                <Input type="number" value={item.quantity} onChange={e => updateQuantity(item.cartItemId, parseInt(e.target.value) || 0)} className="h-8 w-14 text-center p-1" />
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
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
        <SelectVariantDialog
            product={variantSelectionProduct}
            open={!!variantSelectionProduct}
            onOpenChange={() => setVariantSelectionProduct(null)}
            onSelectVariant={(variant) => {
                if(variantSelectionProduct) {
                    addVariantToCart(variantSelectionProduct, variant);
                }
                setVariantSelectionProduct(null);
            }}
        />

        {/* Dialogo de Comprobante después de la venta */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
            <DialogContent className="max-w-4xl p-0 bg-muted/20">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2"><FileCheck className="text-green-600" /> ¡Venta Registrada!</DialogTitle>
                    <DialogDescription>Aquí tienes el comprobante de la última operación.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-y-auto p-6">
                    {lastOrder && <OrderReceipt order={lastOrder} />}
                </div>
                <DialogFooter className="p-6 pt-0">
                    <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
