
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { useDocument } from '@/hooks/use-document';
import { where } from 'firebase/firestore';
import { FixedSizeList as List } from 'react-window';
import type { StoreProduct, GlobalRates, Store } from '@/lib/types';
import { PageHeader } from '../ui/page-header';
import Loader from '../ui/loader';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { TableHead, TableHeader, TableRow } from '../ui/table';
import { RefreshCw, Search, ArrowDownCircle, Layers, TrendingDown, TrendingUp } from 'lucide-react';
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
const ROW_HEIGHT = 85;

interface FinanceProductRowProps {
    data: {
        products: StoreProduct[];
        tasaOficial: number;
        tasaParalela: number;
    };
    index: number;
    style: React.CSSProperties;
}

const FinanceProductRow = ({ data, index, style }: FinanceProductRowProps) => {
    const product = data.products[index];
    const { tasaOficial, tasaParalela } = data;

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
                    sku: variant.sku || ''
                };
            }
        }
        return {
            price: product.promotionalPrice || product.price,
            stock: product.currentStock,
            costPriceUsd: product.costPriceUsd || 0,
            name: product.name,
            sku: ''
        };
    }, [product, selectedVariantId]);

    const metrics = useMemo(() => {
        const precioVenta = currentData.price;
        const precioVes = precioVenta * tasaOficial;
        const valorRealUsd = precioVes / (tasaParalela || 1);
        const gananciaReal = valorRealUsd - currentData.costPriceUsd;

        const precioVesCashea = precioVes * (1 - CASHEA_COMMISSION);
        const valorRealCashea = precioVesCashea / (tasaParalela || 1);
        const gananciaRealCashea = valorRealCashea - currentData.costPriceUsd;

        return {
            precioVenta,
            precioVes,
            valorRealUsd,
            gananciaReal,
            gananciaRealCashea,
            isLoss: gananciaReal <= 0
        };
    }, [currentData.price, currentData.costPriceUsd, tasaOficial, tasaParalela]);

    return (
        <div style={style} className={cn("border-b hover:bg-muted/30 transition-colors flex items-center px-4", metrics.isLoss && "bg-destructive/5")}>
            <div className="flex-1 flex items-center gap-3 min-w-[250px]">
                <Image 
                    src={getImageUrl(product.storeSpecificImage || product.globalImage, product.productId, 40, 40)} 
                    alt={product.name} 
                    width={40} 
                    height={40} 
                    className="rounded-md object-cover border" 
                />
                <div className="space-y-1">
                    <p className="font-medium text-sm truncate max-w-[200px]">{product.name}</p>
                    {product.hasVariations && (
                        <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3 text-muted-foreground" />
                            <Select value={selectedVariantId || ""} onValueChange={setSelectedVariantId}>
                                <SelectTrigger className="h-6 text-[10px] w-[130px] px-2 bg-background">
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
                    <div className="flex gap-1 items-center">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{currentData.stock} unid.</Badge>
                        {currentData.sku && <span className="text-[9px] text-muted-foreground font-mono">SKU: {currentData.sku}</span>}
                    </div>
                </div>
            </div>
            
            <div className="w-[100px] text-center font-mono text-xs">${metrics.precioVenta.toFixed(2)}</div>
            <div className="w-[120px] text-center font-mono text-xs text-muted-foreground">{metrics.precioVes.toFixed(2)} Bs</div>
            <div className="w-[100px] text-center font-mono text-xs font-bold">${metrics.valorRealUsd.toFixed(2)}</div>
            <div className="w-[100px] text-center font-mono text-xs text-muted-foreground">${currentData.costPriceUsd.toFixed(2)}</div>
            
            <div className={cn("w-[120px] text-right font-mono text-xs font-bold flex flex-col items-end gap-0.5", metrics.gananciaReal > 0 ? 'text-green-600' : 'text-destructive')}>
                <span className="flex items-center gap-1">
                    {metrics.gananciaReal > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    ${metrics.gananciaReal.toFixed(2)}
                </span>
                {metrics.isLoss && <span className="text-[8px] uppercase tracking-tighter bg-destructive text-destructive-foreground px-1 rounded">Pérdida Crítica</span>}
            </div>
        </div>
    );
};

function PriceSuggester({ tasaOficial, tasaParalela }: { tasaOficial: number; tasaParalela: number }) {
    const [costoUsd, setCostoUsd] = useState(10);
    const [margen, setMargen] = useState(30);

    const precioSugerido = useMemo(() => {
        if (!tasaOficial || !tasaParalela || !costoUsd || !margen) return 0;
        return (costoUsd * (1 + margen / 100) * tasaParalela) / tasaOficial;
    }, [costoUsd, margen, tasaOficial, tasaParalela]);

    return (
        <Card className="border-primary/20 shadow-sm h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Calculadora de Precio Seguro</CardTitle>
                <CardDescription>Evita pérdidas calculando el precio de app basado en reposición real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Costo (USD)</Label>
                        <Input type="number" value={costoUsd} onChange={e => setCostoUsd(parseFloat(e.target.value) || 0)} className="h-8" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Margen (%)</Label>
                        <Input type="number" value={margen} onChange={e => setMargen(parseFloat(e.target.value) || 0)} className="h-8" />
                    </div>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Marcar en la App:</span>
                    </div>
                    <div className="text-3xl font-black text-primary">${precioSugerido.toFixed(2)}</div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function FinanceClient({ storeId }: { storeId: string }) {
  const { toast } = useToast();
  const { data: globalRates, loading: ratesLoading } = useDocument<GlobalRates>("Config/rates");
  const { data: store, loading: storeLoading } = useDocument<Store>(`Stores/${storeId}`);
  
  const [localTasaParalela, setLocalTasaParalela] = useState<number>(40);
  const [localTasaOficial, setLocalTasaOficial] = useState<number>(36.5);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showOnlyLosses, setShowOnlyLosses] = useState(false);
  
  const { data: products, loading, error } = useFirestoreQuery<StoreProduct>('Inventory', [
    where('storeId', '==', storeId),
  ]);

  // Debounce search to improve performance
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (globalRates) setLocalTasaOficial(globalRates.tasaOficial);
    if (store?.tasaParalela) setLocalTasaParalela(store.tasaParalela);
    else if (globalRates?.tasaParalela) setLocalTasaParalela(globalRates.tasaParalela);
  }, [globalRates, store]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        if (!matchesSearch) return false;

        if (showOnlyLosses) {
            if (p.hasVariations && p.variants?.length > 0) {
                return p.variants.some(v => ((v.price * localTasaOficial) / (localTasaParalela || 1)) <= (v.costPriceUsd || 0));
            }
            const valorRealUsd = (p.price * localTasaOficial) / (localTasaParalela || 1);
            return valorRealUsd <= (p.costPriceUsd || 0);
        }

        return true;
    });
  }, [products, debouncedSearch, showOnlyLosses, localTasaOficial, localTasaParalela]);

  const handleSyncBCV = async () => {
    setIsSyncing(true);
    const result = await fetchBcvRate(storeId);
    if (result.error) toast({ variant: 'destructive', title: 'Error', description: result.error });
    else toast({ title: 'Tasas Sincronizadas', description: 'BCV actualizado y tu Paralelo ajustado al +10%.' });
    setIsSyncing(false);
  };

  if (loading || ratesLoading || storeLoading) return <Loader text="Cargando análisis financiero de alto rendimiento..." />;
  if (error) return <p className="text-destructive text-center p-10">Error al cargar inventario: {error.message}</p>;

  return (
    <TooltipProvider>
      <PageHeader title="Sinceridad de Ganancias" description="Arquitectura optimizada para auditoría masiva de inventarios (+15k productos)." />
      
      <div className="mb-8">
        <SalesAnalysis storeId={storeId} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
             <Card className="h-full">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg">Configuración Cambiaria</CardTitle>
                            <CardDescription>Tasas base para la detección de pérdidas reales.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSyncBCV} disabled={isSyncing} className="h-8">
                            <RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} />
                            Sincronizar BCV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Oficial (BCV)</Label>
                        <div className="relative">
                            <Input value={localTasaOficial} readOnly className="bg-muted pl-10 font-mono h-10 text-lg" />
                            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">Bs.</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reposición (Paralelo)</Label>
                        <div className="relative">
                            <Input 
                                type="number" 
                                value={localTasaParalela} 
                                onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setLocalTasaParalela(val);
                                    if (val > 0) updateStoreParallelRate(storeId, val);
                                }} 
                                className="pl-10 font-mono border-primary/40 focus:ring-primary h-10 text-lg" 
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

      <Card className="flex flex-col min-h-[600px]">
        <CardHeader className="sticky top-0 z-10 bg-background border-b rounded-t-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        Auditoría de Inventario 
                        <Badge variant="outline" className="font-mono">{filteredProducts.length} ítems</Badge>
                    </CardTitle>
                    <CardDescription>Análisis en tiempo real de rentabilidad neta.</CardDescription>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nombre o variante..." 
                            className="pl-9 h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className={cn("flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors", showOnlyLosses ? "bg-destructive/10 border-destructive/30" : "bg-muted/50")}>
                        <Label htmlFor="losses-only" className={cn("text-xs font-bold cursor-pointer", showOnlyLosses ? "text-destructive" : "text-muted-foreground")}>
                            {showOnlyLosses ? "PÉRDIDAS DETECTADAS" : "VER TODO"}
                        </Label>
                        <Switch 
                            id="losses-only" 
                            checked={showOnlyLosses} 
                            onCheckedChange={setShowOnlyLosses}
                            className="data-[state=checked]:bg-destructive"
                        />
                    </div>
                </div>
            </div>
            
            {/* Table Header simulation for virtualized list */}
            <div className="flex mt-6 px-4 py-2 bg-muted/50 rounded-md text-[10px] uppercase font-bold text-muted-foreground border">
                <div className="flex-1">Producto / Variante</div>
                <div className="w-[100px] text-center">PVP App</div>
                <div className="w-[120px] text-center">Ref. VES</div>
                <div className="w-[100px] text-center">Valor Real</div>
                <div className="w-[100px] text-center">Costo Rep.</div>
                <div className="w-[120px] text-right">Ganancia Neta</div>
            </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-grow">
            {filteredProducts.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="italic">No hay resultados para esta auditoría.</p>
                </div>
            ) : (
                <List
                    height={500}
                    itemCount={filteredProducts.length}
                    itemSize={ROW_HEIGHT}
                    width="100%"
                    itemData={{
                        products: filteredProducts,
                        tasaOficial: localTasaOficial,
                        tasaParalela: localTasaParalela
                    }}
                >
                    {FinanceProductRow}
                </List>
            )}
        </CardContent>
        <div className="p-4 border-t bg-muted/20 rounded-b-lg flex justify-between items-center text-[10px] text-muted-foreground italic">
            <span>* Los precios sombreados en rojo indican que el cambio oficial (BCV) no cubre el costo de reposición (Paralelo).</span>
            <span className="font-bold">Total productos en tienda: {products?.length || 0}</span>
        </div>
      </Card>
    </TooltipProvider>
  );
}
