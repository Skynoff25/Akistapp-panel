"use client";

import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, subDays } from 'date-fns';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { getSalesAnalysisStats } from '@/app/dashboard/sales-actions';
import { useToast } from '@/hooks/use-toast';

interface SalesAnalysisProps {
  storeId: string;
}

const dateRanges = {
  thisMonth: {
    label: "Este Mes",
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  },
  lastMonth: {
    label: "Mes Pasado",
    start: startOfMonth(subMonths(new Date(), 1)),
    end: endOfMonth(subMonths(new Date(), 1)),
  },
  last30Days: {
    label: "Últimos 30 Días",
    start: startOfDay(subDays(new Date(), 29)),
    end: endOfDay(new Date()),
  },
};

function StatBox({ title, value, help, positive }: { title: string, value: string, help: string, positive?: boolean }) {
  return (
    <div className="flex flex-col p-4 border rounded-lg bg-background">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={cn(
        "text-2xl font-bold",
        positive === true && "text-green-600",
        positive === false && "text-red-600",
      )}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{help}</p>
    </div>
  );
}

export function SalesAnalysis({ storeId }: SalesAnalysisProps) {
  const [rangeKey, setRangeKey] = useState<keyof typeof dateRanges>('thisMonth');
  const selectedRange = dateRanges[rangeKey];

  const [analysis, setAnalysis] = useState({
    totalCost: 0,
    totalRealValue: 0,
    netProfit: 0,
    totalSalesOfficial: 0,
    totalItemsSold: 0,
    analyzedOrdersCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const res = await getSalesAnalysisStats(storeId, selectedRange.start.getTime(), selectedRange.end.getTime());
        if (mounted) {
          if (res.success && res.data) {
            setAnalysis(res.data);
          } else {
            toast({ variant: 'destructive', title: 'Error', description: res.error || 'Failed to analyze sales' });
          }
        }
      } catch (err: any) {
        if (mounted) toast({ variant: 'destructive', title: 'Error', description: err.message });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAnalysis();
    return () => { mounted = false; };
  }, [storeId, selectedRange.start, selectedRange.end]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle>Análisis de Ventas</CardTitle>
                <CardDescription>Rentabilidad real de ventas entregadas (Excluye cancelados y devueltos).</CardDescription>
            </div>
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Seleccionar rango" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(dateRanges).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (analysis.analyzedOrdersCount === 0 ? (
            <p className="text-muted-foreground text-center py-10">
                No hay ventas confirmadas en este período para analizar.
                <span className="block text-xs mt-2">Los pedidos deben estar en estado "Entregado" para reflejarse aquí.</span>
            </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <StatBox 
                title="Ganancia Neta Real (USD)"
                value={`$${analysis.netProfit.toFixed(2)}`}
                help="Valor real de ventas menos costo de reposición."
                positive={analysis.netProfit >= 0}
              />
              <StatBox 
                title="Valor Real de Ventas (USD)"
                value={`$${analysis.totalRealValue.toFixed(2)}`}
                help="Total en USD que te queda para reponer inventario."
              />
              <StatBox 
                title="Costo de Reposición (USD)"
                value={`$${analysis.totalCost.toFixed(2)}`}
                help="Costo total de los artículos vendidos."
              />
               <StatBox 
                title="Ventas Totales (Oficial)"
                value={`$${analysis.totalSalesOfficial.toFixed(2)}`}
                help="Suma de los totales cobrados en la app (con descuentos)."
              />
               <StatBox 
                title="Artículos Vendidos"
                value={analysis.totalItemsSold.toString()}
                help={`En ${analysis.analyzedOrdersCount} ventas analizadas.`}
              />
               <StatBox 
                title="Margen Neto Real"
                value={`${analysis.totalRealValue > 0 ? ((analysis.netProfit / analysis.totalRealValue) * 100).toFixed(1) : '0.0'}%`}
                help="Porcentaje de ganancia sobre el valor real."
                positive={analysis.netProfit >= 0}
              />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
