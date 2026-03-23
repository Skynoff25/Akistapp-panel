"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { useDocument } from '@/hooks/use-document';
import { where, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StoreProduct, ProductVariant, GlobalRates, Store, Order, StoreCoupon } from '@/lib/types';
import { PageHeader } from '../ui/page-header';
import Loader from '../ui/loader';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, PlusCircle, MinusCircle, XCircle, ShoppingCart, RefreshCw, FileCheck, Tag, Percent, ChevronLeft, ChevronRight } from 'lucide-react';

const POS_PAGE_SIZE = 20;
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createManualSale } from '@/app/store/[storeId]/pos/actions';
import { updateStoreParallelRate, fetchBcvRate } from '@/app/dashboard/rates-actions';
import { HelpTip } from '@/components/ui/help-tip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Label } from '../ui/label';
import { OrderReceipt } from '../orders/order-receipt';
import { Separator } from '../ui/separator';

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
  unit?: string; // 'KG' | 'GR' | 'LB' | 'UNIT'
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
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
      setIsClient(true);
      const saved = localStorage.getItem(`pos_cart_${storeId}`);
      if (saved) {
          try { setCart(JSON.parse(saved)); } catch(e) {}
      }
  }, [storeId]);

  useEffect(() => {
      if (isClient) {
          localStorage.setItem(`pos_cart_${storeId}`, JSON.stringify(cart));
      }
  }, [cart, storeId, isClient]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', nationalId: '', phone: '' });
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  
  const [localTasaOficial, setLocalTasaOficial] = useState(36.5);
  const [localTasaParalela, setLocalTasaParalela] = useState(40);
  const [isSyncing, setIsSyncing] = useState(false);
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<StoreProduct | null>(null);
  
  // --- Estados de Descuento ---
  const [couponInput, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<StoreCoupon | null>(null);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

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

  const [posPage, setPosPage] = useState(1);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, searchTerm]);

  // Reset to page 1 on search
  useEffect(() => { setPosPage(1); }, [searchTerm]);

  const posTotalPages = Math.max(1, Math.ceil(filteredInventory.length / POS_PAGE_SIZE));
  const paginatedInventory = filteredInventory.slice(
    (posPage - 1) * POS_PAGE_SIZE,
    posPage * POS_PAGE_SIZE
  );

  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const couponDiscountValue = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'FIXED') return appliedCoupon.discountValue;
    return (cartSubtotal * appliedCoupon.discountValue) / 100;
  }, [appliedCoupon, cartSubtotal]);

  const finalTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - couponDiscountValue - manualDiscount);
  }, [cartSubtotal, couponDiscountValue, manualDiscount]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsValidatingCoupon(true);
    try {
        const q = query(
            collection(db, "Coupons"), 
            where("storeId", "==", storeId), 
            where("code", "==", couponInput.trim().toUpperCase()),
            where("isActive", "==", true)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
            toast({ variant: 'destructive', title: 'Cupón Inválido', description: 'El código no existe o está inactivo.' });
            setAppliedCoupon(null);
        } else {
            const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() } as StoreCoupon;
            if (Date.now() > coupon.expirationDate) {
                toast({ variant: 'destructive', title: 'Cupón Expirado', description: 'Este cupón ya no es válido.' });
                setAppliedCoupon(null);
            } else {
                setAppliedCoupon(coupon);
                toast({ title: 'Cupón Aplicado', description: `Se ha aplicado el descuento de ${coupon.code}.` });
            }
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo validar el cupón.' });
    } finally {
        setIsValidatingCoupon(false);
    }
  };

  const addBaseProductToCart = (product: StoreProduct) => {
    const isWeightUnit = product.unit && product.unit !== 'UNIT';
    const defaultQty = isWeightUnit ? 0.1 : 1;
    const cartStep = isWeightUnit ? 0.1 : 1;
    setCart(prevCart => {
      const cartItemId = product.id;
      const existingItem = prevCart.find(item => item.cartItemId === cartItemId);
      if (existingItem) {
        const newQty = parseFloat((existingItem.quantity + cartStep).toFixed(3));
        if (newQty > product.currentStock) {
          toast({ variant: 'destructive', title: 'Stock insuficiente' });
          return prevCart;
        }
        return prevCart.map(item =>
          item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item
        );
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
          quantity: defaultQty,
          image: getImageUrl(product.storeSpecificImage || product.globalImage, product.productId, 40, 40),
          stock: product.currentStock,
          costPriceUsd: product.costPriceUsd || 0,
          unit: product.unit || 'UNIT',
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
          unit: 'UNIT', // Variants are always per unit
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
      const isWeight = itemToUpdate.unit && itemToUpdate.unit !== 'UNIT';
      const rounded = isWeight ? parseFloat(newQuantity.toFixed(3)) : Math.round(newQuantity);
      if (rounded <= 0) {
        return prevCart.filter(item => item.cartItemId !== cartItemId);
      }
      if (rounded > itemToUpdate.stock) {
        toast({ variant: 'destructive', title: 'Stock insuficiente' });
        return prevCart;
      }
      return prevCart.map(item =>
        item.cartItemId === cartItemId ? { ...item, quantity: rounded } : item
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
        unit: item.unit,
    }));
    
    const formData = new FormData();
    formData.append('items', JSON.stringify(saleItems));
    formData.append('totalAmount', String(cartSubtotal));
    formData.append('finalTotal', String(finalTotal));
    formData.append('couponCode', appliedCoupon?.code || '');
    formData.append('couponDiscount', String(couponDiscountValue));
    formData.append('manualDiscount', String(manualDiscount));
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
        setAppliedCoupon(null);
        setManualDiscount(0);
        setCouponCode('');
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
                <Label htmlFor="tasa-paralela-pos" className="flex items-center gap-1.5">
                  Tasa de Reposición (Paralelo) - Tu Tienda
                  <HelpTip text="Tasa paralela exclusiva de tu tienda.\nSe usa para calcular el costo real de reposición en USD en tus reportes.\nActualiza regularmente para que las finanzas sean precisas." side="bottom" />
                </Label>
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
                <CardContent className="p-0">
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
                            {paginatedInventory.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No hay productos disponibles.</TableCell></TableRow>
                            ) : paginatedInventory.map(p => (
                                <TableRow key={p.id} className={!p.isAvailable ? "opacity-50 grayscale" : ""}>
                                    <TableCell className="flex items-center gap-2">
                                        <Image src={getImageUrl(p.storeSpecificImage || p.globalImage, p.productId, 40, 40)} alt={p.name} width={40} height={40} className="rounded-md object-cover" />
                                        <div>
                                          <p>{p.name}</p>
                                          {p.unit && p.unit !== 'UNIT' && (
                                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{p.unit}</span>
                                          )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                      {p.unit && p.unit !== 'UNIT'
                                        ? `${p.currentStock} ${p.unit.toLowerCase()}`
                                        : p.currentStock}
                                    </TableCell>
                                    <TableCell>
                                      {p.priceRange
                                        ? p.priceRange
                                        : `$${(p.promotionalPrice || p.price).toFixed(2)}${p.unit && p.unit !== 'UNIT' ? `/${p.unit.toLowerCase()}` : ''}`}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => handleProductClick(p)} disabled={p.currentStock <= 0 || !p.isAvailable}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            {p.hasVariations ? 'Opciones' : 'Añadir'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {posTotalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2 border-t text-sm">
                            <span className="text-xs text-muted-foreground">
                                {(posPage - 1) * POS_PAGE_SIZE + 1}–{Math.min(posPage * POS_PAGE_SIZE, filteredInventory.length)} de {filteredInventory.length}
                            </span>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPosPage(p => Math.max(1, p - 1))} disabled={posPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="flex items-center text-xs px-1">{posPage}/{posTotalPages}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPosPage(p => Math.min(posTotalPages, p + 1))} disabled={posPage === posTotalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <Card className="flex flex-col h-full sticky top-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><ShoppingCart /> Carrito de Venta</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <ScrollArea className="h-[30vh] pr-4">
                        {cart.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">El carrito está vacío.</p>
                        ) : (
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <div key={item.cartItemId} className="flex items-start gap-3">
                                        <Image src={item.image} alt={item.name} width={48} height={48} className="rounded-md" />
                                        <div className="flex-grow">
                                            <p className="font-medium text-xs leading-tight">{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                              ${item.price.toFixed(2)}{item.unit && item.unit !== 'UNIT' ? `/${item.unit.toLowerCase()}` : ''}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {(() => {
                                                  const isWeight = item.unit && item.unit !== 'UNIT';
                                                  const step = isWeight ? 0.1 : 1;
                                                  return (
                                                    <>
                                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, parseFloat((item.quantity - step).toFixed(3)))}><MinusCircle className="h-4 w-4" /></Button>
                                                      <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        step={isWeight ? 0.001 : 1}
                                                        onChange={e => updateQuantity(item.cartItemId, parseFloat(e.target.value) || 0)}
                                                        className="h-7 w-16 text-center p-1 text-xs"
                                                      />
                                                      <span className="text-[10px] text-muted-foreground">{item.unit && item.unit !== 'UNIT' ? item.unit.toLowerCase() : ''}</span>
                                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, parseFloat((item.quantity + step).toFixed(3)))}><PlusCircle className="h-4 w-4" /></Button>
                                                    </>
                                                  );
                                                })()}
                                            </div>
                                        </div>
                                        <p className="font-semibold text-xs">${(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    <Separator />

                    {/* --- Sección de Descuentos --- */}
                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-dashed">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                              <Tag className="h-3 w-3"/> Cupón de Descuento
                              <HelpTip text="Código creado en la sección 'Cupones'.\nPuede ser porcentaje (%) o monto fijo ($).\nSe aplica al subtotal del carrito." />
                            </Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="CÓDIGO" 
                                    className="h-8 text-xs uppercase" 
                                    value={couponInput} 
                                    onChange={e => setCouponCode(e.target.value)}
                                    disabled={!!appliedCoupon}
                                />
                                {appliedCoupon ? (
                                    <Button size="sm" variant="ghost" className="h-8 text-destructive px-2" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button size="sm" className="h-8 text-[10px]" onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponInput}>
                                        {isValidatingCoupon ? '...' : 'APLICAR'}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                              <Percent className="h-3 w-3"/> Descuento Manual ($)
                              <HelpTip text="Monto libre en $ que se resta del total.\nQueda registrado en el historial de la venta.\nNo requiere código de cupón." />
                            </Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                className="h-8 text-xs" 
                                placeholder="0.00"
                                value={manualDiscount || ''}
                                onChange={e => setManualDiscount(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </CardContent>

                 <div className="p-4 border-t space-y-4">
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal:</span>
                            <span>${cartSubtotal.toFixed(2)}</span>
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between text-primary font-medium">
                                <span>Cupón ({appliedCoupon.code}):</span>
                                <span>-${couponDiscountValue.toFixed(2)}</span>
                            </div>
                        )}
                        {manualDiscount > 0 && (
                            <div className="flex justify-between text-destructive font-medium">
                                <span>Desc. Manual:</span>
                                <span>-${manualDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                            <span>Total Final:</span>
                            <span className="text-primary">${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase font-bold text-muted-foreground">Información del Cliente</h4>
                        {customerInfo.name ? (
                            <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/50 rounded-md">
                                <p><span className="font-semibold text-foreground">Cliente:</span> {customerInfo.name}</p>
                                {customerInfo.nationalId && <p><span className="font-semibold text-foreground">Cédula:</span> {customerInfo.nationalId}</p>}
                                <Button variant="link" className="p-0 h-auto text-[10px] mt-1" onClick={() => setCustomerDialogOpen(true)}>
                                    Editar Datos
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="w-full text-[10px] h-8" onClick={() => setCustomerDialogOpen(true)}>
                                Añadir Datos de Cliente
                            </Button>
                        )}
                    </div>
                    
                    {store?.paymentMethods && store.paymentMethods.length > 0 && (
                        <Alert className="bg-blue-50/50 border-blue-200">
                            <Tag className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800 text-xs font-semibold">Métodos de Pago</AlertTitle>
                            <AlertDescription className="text-blue-700 text-[10px]">
                                El recibo mostrará sus métodos activos. Recuerde al cliente: "Antes de realizar el pago contáctate con la empresa para corroborar los montos".
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button className="w-full py-6 text-base font-bold shadow-lg" onClick={handleCompleteSale} disabled={isSubmitting || cart.length === 0}>
                        {isSubmitting ? "REGISTRANDO..." : "COMPLETAR VENTA"}
                    </Button>
                </div>
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
