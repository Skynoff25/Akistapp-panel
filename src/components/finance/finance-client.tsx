"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { useDocument } from '@/hooks/use-document';
import { where } from 'firebase/firestore';
import type { StoreProduct, GlobalRates, Store, ProductVariant } from '@/lib/types';
import { PageHeader } from '../ui/page-header';
import Loader from '../ui/loader';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, RefreshCw, Search, ArrowDownCircle, Layers } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { Button } from '../ui/button';
import { TooltipProvider } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { SalesAnalysis } from './sales-analysis';
import { updateStoreParallelRate, fetchBcvRate } from '@/app/dashboard/rates-actions';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const CASHEA_COMMISSION = 0.07;

interface FinanceProductRowProps {
    product: StoreProduct;
    tasaOficial: number;
    tasaParalela: number;
}

function FinanceProductRow({ product, tasaOficial, tasaParalela }: FinanceProductRowProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() => {
        if (product.hasVariations && product.variants?.length > 0) {
            return product.variants[0].id;
        }
        return null;
    });

    const currentData = useMemo(() => {
        if (product.hasVariations && selectedVariantId) {
            const variant = product.variants.find(v => v.id === selectedVariantId);
            if (variant) {
                return {
                    price: variant.price,
                    stock: variant.stock,
                    costPriceUsd: variant.costPriceUsd || product.costPriceUsd || 0,
                    name: `${product.name} (${variant.name})`,
                    isVariant: true
                };
            }
        }
        return {
            price: product.promotionalPrice || product.price,
            stock: product.currentStock,
            costPriceUsd: product.costPriceUsd || 0,
            name: product.name,
            isVariant: false
        };
    }, [product, selectedVariantId]);

    const metrics = useMemo(() => {
        const precioVenta = currentData.price;
        const precioVes = precioVenta * tasaOficial;
        const valorRealUsd = precioVes / tasaParalela;
        const gananciaReal = valorRealUsd - currentData.costPriceUsd;

        const precioVesCashea = precioVes * (1 - CASHEA_COMMISSION);
        const valorRealCashea = precioVesCashea / tasaParalela;
        const gananciaRealCashea = valorRealCashea - currentData.costPriceUsd;

        return {
            precioVenta,
            precioVes,
            valorRealUsd,
            gananciaReal,
            gananciaRealCashea,
            isLoss: gananciaReal < 0
        };
    }, [currentData.price, currentData.costPriceUsd, tasaOficial, tasaParalela]);

    return (
        <TableRow className={cn(metrics.isLoss && "bg-destructive/5 hover:bg-destructive/10")}>
            <TableCell className="min-w-[250px]">
                <div className="flex items-center gap-3">
                    <Image 
                        src={getImageUrl(product.storeSpecificImage || product.globalImage, product.productId, 40, 40)} 
                        alt={product.name} 
                        width={40} 
                        height={40} 
                        className="rounded-md object-cover border" 
                    />
                    <div className="space-y-1">
                        <p className="font-medium text-sm leading-none">{product.name}</p>
                        {product.hasVariations && (
                            <div className="flex items-center gap-2 mt-1">
                                <Layers className="h-3 w-3 text-muted-foreground" />
                                <Select value={selectedVariantId || ""} onValueChange={setSelectedVariantId}>
                                    <SelectTrigger className="h-7 text-[10px] w-[140px] px-2">
                                        <SelectValue placeholder="Variante" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {product.variants.map(v => (
                                            <SelectItem key={v.id} value={v.id} className="text-[10px]">
                                                {v.name} (${v.price.toFixed(2)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="flex gap-1">
                            {product.casheaEligible && <Badge variant="outline" className="text-[9px] h-4 px-1">Cashea</Badge>}
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">{currentData.stock} unid.</Badge>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="font-mono text-xs">${metrics.precioVenta.toFixed(2)}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{metrics.precioVes.toFixed(2)} Bs</TableCell>
            <TableCell className="font-mono text-xs font-semibold">${metrics.valorRealUsd.toFixed(2)}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">${currentData.costPriceUsd.toFixed(2)}</TableCell>
            <TableCell className={cn("font-mono text-xs font-bold", metrics.gananciaReal >= 0 ? 'text-green-600' : 'text-destructive')}>
                ${metrics.gananciaReal.toFixed(2)}
                {metrics.isLoss && (
                    <span className="block text-[9px] animate-pulse">¡PÉRDIDA!</span>
                )}
            </TableCell>
            <TableCell className="font-mono text-xs">
                {product.casheaEligible ? (
                    <span className={metrics.gananciaRealCashea >= 0 ? 'text-green-600' : 'text-destructive'}>
                        ${metrics.gananciaRealCashea.toFixed(2)}
                    </span>
                ) : <span className="text-muted-foreground">-</span>}
            </TableCell>
        </TableRow>
    );
}

function PriceSuggester({ tasaOficial, tasaParalela }: { tasaOficial: number; tasaParalela: number }) {
    const [costoUsd, setCostoUsd] = useState(10);
    const [margen, setMargen] = useState(30);

    const precioSugerido = useMemo(() => {
        if (!tasaOficial || !tasaParalela || !costoUsd || !margen) return 0;
        return (costoUsd * (1 + margen / 100) * tasaParalela) / tasaOficial;
    }, [costoUsd, margen, tasaOficial, tasaParalela]);

    return (
        <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Calculadora de Precio Seguro</CardTitle>
                <CardDescription>Evita pérdidas calculando el precio de app basado en reposición real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="costo-usd" className="text-xs uppercase font-bold text-muted-foreground">Costo de Reposición (USD)</Label>
                        <Input id="costo-usd" type="number" value={costoUsd} onChange={e => setCostoUsd(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="margen" className="text-xs uppercase font-bold text-muted-foreground">Margen Neto Deseado (%)</Label>
                        <Input id="margen" type="number" value={margen} onChange={e => setMargen(parseFloat(e.target.value) || 0)} />
                    </div>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Precio a marcar en la App:</span>
                    </div>
                    <div className="text-3xl font-black text-primary">${precioSugerido.toFixed(2)}</div>
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                        * Al vender a este precio, recibirás suficientes Bs para comprar el producto a tasa paralela y conservar tu {margen}% de ganancia.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

export default function FinanceClient({ storeId }: { storeId: string }) {
  const { toast } = useToast();
  const { data: globalRates, loading: ratesLoading } = useDocument<GlobalRates>("Config/rates");
  const { data: store, loading: storeLoading } = useDocument<Store>(`Stores/${storeId}`);
  
  const [localTasaParalela, setLocalTasaParalela] = useState<number>(40);
  const [localTasaOficial, setLocalTasaOficial] = useState<number>(36.5);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Estados de filtrado
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyLosses, setShowOnlyLosses] = useState(false);
  
  const { data: products, loading, error } = useFirestoreQuery<StoreProduct>('Inventory', [
    where('storeId', '==', storeId),
  ]);

  useEffect(() => {
    if (globalRates) setLocalTasaOficial(globalRates.tasaOficial);
    if (store?.tasaParalela) setLocalTasaParalela(store.tasaParalela);
    else if (globalRates?.tasaParalela) setLocalTasaParalela(globalRates.tasaParalela);
  }, [globalRates, store]);

  const handleSyncBCV = async () => {
    setIsSyncing(true);
    const result = await fetchBcvRate(storeId);
    if (result.error) toast({ variant: 'destructive', title: 'Error', description: result.error });
    else toast({ title: 'Tasas Sincronizadas', description: 'BCV actualizado y tu Paralelo ajustado al +10%.' });
    setIsSyncing(false);
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(p => {
        // 1. Filtro de búsqueda
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        // 2. Filtro de pérdidas
        if (showOnlyLosses) {
            // Evaluamos la variante principal o el producto base
            let price = p.promotionalPrice || p.price;
            let cost = p.costPriceUsd || 0;

            if (p.hasVariations && p.variants?.length > 0) {
                // If variant losses exist, show the product
                return p.variants.some(v => ((v.price * localTasaOficial) / localTasaParalela) < v.costPriceUsd);
            }

            const valorRealUsd = (price * localTasaOficial) / localTasaParalela;
            return valorRealUsd < cost;
        }

        return true;
    });
  }, [products, searchQuery, showOnlyLosses, localTasaOficial, localTasaParalela]);

  if (loading || ratesLoading || storeLoading) return <Loader text="Cargando análisis financiero..." />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <TooltipProvider>
      <PageHeader title="Sinceridad de Ganancias" description="Calcula tu rentabilidad real neta en USD considerando la brecha cambiaria oficial vs paralelo." />
      
      <div className="mb-8">
        <SalesAnalysis storeId={storeId} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 space-y-8">
             <Card>
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg">Configuración de Divisas</CardTitle>
                            <CardDescription>Define las tasas para los cálculos de rentabilidad.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSyncBCV} disabled={isSyncing} className="h-8">
                            <RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} />
                            Sincronizar BCV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Tasa Oficial (BCV) - Global</Label>
                        <div className="relative">
                            <Input value={localTasaOficial} readOnly className="bg-muted pl-10 font-mono" />
                            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">Bs.</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Tasa de Reposición (Tu Tienda)</Label>
                        <div className="relative">
                            <Input 
                                type="number" 
                                value={localTasaParalela} 
                                onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setLocalTasaParalela(val);
                                    if (val > 0) updateStoreParallelRate(storeId, val);
                                }} 
                                className="pl-10 font-mono border-primary/40 focus:ring-primary" 
                            />
                            <span className="absolute left-3 top-2.5 text-xs text-primary font-bold">Bs.</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <PriceSuggester tasaOficial={localTasaOficial} tasaParalela={localTasaParalela} />
        </div>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <CardTitle>Auditoría de Rentabilidad de Inventario</CardTitle>
                    <CardDescription>Analiza producto por producto para detectar precios que generan pérdidas.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-[250px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar producto..." 
                            className="pl-8 h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
                        <Label htmlFor="losses-only" className="text-xs font-bold text-destructive cursor-pointer">SOLO PÉRDIDAS</Label>
                        <Switch 
                            id="losses-only" 
                            checked={showOnlyLosses} 
                            onCheckedChange={setShowOnlyLosses}
                            className="data-[state=checked]:bg-destructive"
                        />
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold">Producto / Variante</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">P.V.P App</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Ref. VES</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Valor Real</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Costo Rep.</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Ganancia Neta</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Cashea Net</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                                    {showOnlyLosses ? "No se detectaron productos con pérdida bajo estas tasas. ¡Buen trabajo!" : "No se encontraron productos."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map(p => (
                                <FinanceProductRow 
                                    key={p.id} 
                                    product={p} 
                                    tasaOficial={localTasaOficial} 
                                    tasaParalela={localTasaParalela} 
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 italic">
                * El <strong>Valor Real</strong> es lo que realmente te queda en USD después de cambiar los Bs. cobrados (a tasa BCV) por USD nuevos (a tasa paralela).
            </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
