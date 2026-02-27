"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { useDocument } from '@/hooks/use-document';
import { where } from 'firebase/firestore';
import type { StoreProduct, GlobalRates } from '@/lib/types';
import { PageHeader } from '../ui/page-header';
import Loader from '../ui/loader';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { HelpCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { SalesAnalysis } from './sales-analysis';
import { updateGlobalRates, fetchBcvRate } from '@/app/dashboard/rates-actions';
import { useToast } from '@/hooks/use-toast';

const CASHEA_COMMISSION = 0.07;

function PriceSuggester({ tasaOficial, tasaParalela }: { tasaOficial: number; tasaParalela: number }) {
    const [costoUsd, setCostoUsd] = useState(10);
    const [margen, setMargen] = useState(30);

    const precioSugerido = useMemo(() => {
        if (!tasaOficial || !tasaParalela || !costoUsd || !margen) return 0;
        const precioSugerido = (costoUsd * (1 + margen / 100) * tasaParalela) / tasaOficial;
        return precioSugerido;
    }, [costoUsd, margen, tasaOficial, tasaParalela]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sugerencia de Precio de Venta</CardTitle>
                <CardDescription>Calcula el precio de venta en la app para alcanzar tu margen de ganancia real deseado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="costo-usd">Costo de Reposición (USD)</Label>
                        <Input id="costo-usd" type="number" value={costoUsd} onChange={e => setCostoUsd(parseFloat(e.target.value) || 0)} placeholder="10.00"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="margen">Margen Deseado (%)</Label>
                        <Input id="margen" type="number" value={margen} onChange={e => setMargen(parseFloat(e.target.value) || 0)} placeholder="30"/>
                    </div>
                </div>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Precio Sugerido en App</AlertTitle>
                    <AlertDescription>
                        Para obtener un <strong>{margen}%</strong> de ganancia real, debes marcar el precio del producto en la app a:
                        <span className="block text-2xl font-bold text-primary mt-2">
                            ${precioSugerido.toFixed(2)}
                        </span>
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
}

export default function FinanceClient({ storeId }: { storeId: string }) {
  const { toast } = useToast();
  const { data: rates, loading: ratesLoading } = useDocument<GlobalRates>("Config/rates");
  const [localTasaParalela, setLocalTasaParalela] = useState<number>(40);
  const [localTasaOficial, setLocalTasaOficial] = useState<number>(36.5);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: products, loading, error } = useFirestoreQuery<StoreProduct>('Inventory', [
    where('storeId', '==', storeId),
  ]);

  useEffect(() => {
    if (rates) {
        setLocalTasaOficial(rates.tasaOficial);
        setLocalTasaParalela(rates.tasaParalela);
    }
  }, [rates]);

  const handleParaleloChange = async (val: string) => {
    const num = parseFloat(val) || 0;
    setLocalTasaParalela(num);
    // Guardado automático persistente
    if (num > 0) {
        await updateGlobalRates(localTasaOficial, num);
    }
  };

  const handleSyncBCV = async () => {
    setIsSyncing(true);
    const result = await fetchBcvRate();
    if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Tasas Sincronizadas', description: 'BCV actualizado y Paralelo ajustado al +10%.' });
    }
    setIsSyncing(false);
  };

  const analysisData = useMemo(() => {
    if (!products) return [];
    return products.map(p => {
        const precioVenta = p.promotionalPrice || p.price;
        const precioVes = precioVenta * localTasaOficial;
        const valorRealUsd = precioVes / localTasaParalela;
        const gananciaReal = valorRealUsd - (p.costPriceUsd || 0);

        const precioVesCashea = precioVes * (1 - CASHEA_COMMISSION);
        const valorRealCashea = precioVesCashea / localTasaParalela;
        const gananciaRealCashea = valorRealCashea - (p.costPriceUsd || 0);
        
        return {
            ...p,
            precioVenta,
            precioVes,
            valorRealUsd,
            gananciaReal,
            gananciaRealCashea
        };
    });
  }, [products, localTasaOficial, localTasaParalela]);

  if (loading || ratesLoading) return <Loader text="Cargando análisis financiero..." />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <TooltipProvider>
      <PageHeader title="Finanzas Reales (Profit Sincerity)" description="Calcula tu ganancia real neta en USD considerando la brecha cambiaria." />
      
      <div className="mb-8">
        <SalesAnalysis storeId={storeId} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-8">
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Configuración de Tasas Globales</CardTitle>
                            <CardDescription>Las tasas se guardan automáticamente para toda la aplicación.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSyncBCV} disabled={isSyncing}>
                            {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Sincronizar BCV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tasa-oficial">Tasa Oficial (BCV)</Label>
                        <Input id="tasa-oficial" type="number" value={localTasaOficial} onChange={e => setLocalTasaOficial(parseFloat(e.target.value) || 0)} placeholder="36.50" disabled />
                        <p className="text-[10px] text-muted-foreground italic">Solo lectura. Se actualiza mediante sincronización.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tasa-paralela">Tasa de Reposición (Paralelo)</Label>
                        <Input id="tasa-paralela" type="number" value={localTasaParalela} onChange={e => handleParaleloChange(e.target.value)} placeholder="40.00"/>
                        <p className="text-[10px] text-muted-foreground italic">Edita este campo para guardarlo como referencia global.</p>
                    </div>
                </CardContent>
            </Card>

            <PriceSuggester tasaOficial={localTasaOficial} tasaParalela={localTasaParalela} />

        </div>

        <div className="lg:col-span-3">
             <Card>
                <CardHeader>
                    <CardTitle>Tabla de Análisis de Rentabilidad de Inventario</CardTitle>
                    <CardDescription>Análisis de rentabilidad basado en tu inventario actual y las tasas del día.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>P.V.P App (USD)</TableHead>
                                <TableHead>Precio (VES)</TableHead>
                                <TableHead>Valor Real (USD)</TableHead>
                                <TableHead>Costo Rep. (USD)</TableHead>
                                <TableHead>Ganancia Real (USD)</TableHead>
                                <TableHead>Ganancia Cashea (USD)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysisData.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium flex items-center gap-2 min-w-[200px]">
                                        <Image src={getImageUrl(p.storeSpecificImage || p.globalImage, p.productId, 40, 40)} alt={p.name} width={40} height={40} className="rounded-md object-cover" />
                                        <span>{p.name}</span>
                                        {p.casheaEligible && <Badge variant="outline">Cashea</Badge>}
                                    </TableCell>
                                    <TableCell>${p.precioVenta.toFixed(2)}</TableCell>
                                    <TableCell>{p.precioVes.toFixed(2)} Bs</TableCell>
                                    <TableCell>${p.valorRealUsd.toFixed(2)}</TableCell>
                                    <TableCell>${(p.costPriceUsd || 0).toFixed(2)}</TableCell>
                                    <TableCell className={cn("font-semibold", p.gananciaReal >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {p.gananciaReal.toFixed(2)}
                                        {p.gananciaReal < 0 && ' (Pérdida)'}
                                    </TableCell>
                                    <TableCell className={cn("font-semibold", p.gananciaRealCashea >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {p.casheaEligible ? (
                                             <>
                                             {p.gananciaRealCashea.toFixed(2)}
                                             {p.gananciaRealCashea < 0 && ' (Pérdida)'}
                                             </>
                                        ) : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
