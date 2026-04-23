
"use client";

import { useMemo } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { useDocument } from '@/hooks/use-document';
import { where } from 'firebase/firestore';
import { subDays, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    AlertTriangle, 
    TrendingUp, 
    Clock, 
    CheckCircle2, 
    PackageSearch,
    ShoppingBag
} from 'lucide-react';
import type { Order, StoreProduct, Store } from '@/lib/types';
import { cn } from '@/lib/utils';
import { limit, orderBy } from 'firebase/firestore';

interface StoreKpisProps {
  storeId: string;
}

export function StoreKpis({ storeId }: StoreKpisProps) {
  const lastWeekTimestamp = startOfDay(subDays(new Date(), 7)).getTime();

  // 1. Obtener órdenes de la última semana para el Top 5 y Workflow
  const { data: recentOrders, loading: ordersLoading } = useFirestoreQuery<Order>('Orders', [
    where('storeId', '==', storeId),
    where('createdAt', '>=', lastWeekTimestamp)
  ]);

  // 1.5. Obtener datos de la tienda para configuraciones
  const { data: store, loading: storeLoading } = useDocument<Store>(`Stores/${storeId}`);
  const threshold = store?.lowStockAlertThreshold ?? 5;

  // 2. Obtener inventario para Alertas Críticas (Optimizado a Max 5 lecturas)
  const { data: criticalInventory, loading: inventoryLoading } = useFirestoreQuery<StoreProduct>('Inventory', [
    where('storeId', '==', storeId),
    where('currentStock', '<', threshold),
    orderBy('currentStock', 'asc'),
    limit(5)
  ]);

  const stats = useMemo(() => {
    // --- Lógica de Workflow ---
    const pending = recentOrders.filter(o => o.status === 'PENDING').length;
    const confirmed = recentOrders.filter(o => o.status === 'CONFIRMED').length;
    const ready = recentOrders.filter(o => o.status === 'READY').length;

    // --- Lógica de Inventario Crítico ---
    // Ya vienen ordenados y limitados por la query, solo filtramos isAvailable
    const criticalItems = criticalInventory.filter(p => p.isAvailable);

    // --- Lógica de Top 5 semanal ---
    const productSales: Record<string, { name: string, qty: number }> = {};
    recentOrders.forEach(order => {
        if (order.status !== 'CANCELLED') {
            order.items.forEach(item => {
                if (!productSales[item.productName]) {
                    productSales[item.productName] = { name: item.productName, qty: 0 };
                }
                productSales[item.productName].qty += item.quantity;
            });
        }
    });

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

    return {
      pending,
      confirmed,
      ready,
      criticalItems,
      topProducts
    };
  }, [recentOrders, criticalInventory]);

  if (ordersLoading || inventoryLoading || storeLoading) {
      return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
      </div>;
  }

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: INDICADORES DE ACCIÓN RÁPIDA (GIANT) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Órdenes Pendientes (GIGANTE) */}
        <Card className={cn(
            "relative overflow-hidden border-2 transition-all",
            stats.pending > 0 ? "border-destructive bg-destructive/5" : "border-muted"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className={cn("h-4 w-4", stats.pending > 0 && "text-destructive")} />
                Pedidos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
                "text-6xl font-bold tracking-tighter",
                stats.pending > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"
            )}>
              [{stats.pending}]
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                {stats.pending > 0 ? "¡Tienes clientes esperando!" : "Todo al día por ahora."}
            </p>
          </CardContent>
        </Card>

        {/* Órdenes en Preparación */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                <PackageSearch className="h-4 w-4" />
                En Preparación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-blue-600">{stats.confirmed}</div>
            <p className="text-xs text-blue-600/70 mt-2">Flujo de trabajo actual</p>
          </CardContent>
        </Card>

        {/* Listas para Despacho */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700">
                <CheckCircle2 className="h-4 w-4" />
                Listas para Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-purple-600">{stats.ready}</div>
            <p className="text-xs text-purple-600/70 mt-2">Esperando al cliente o repartidor</p>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN 2: ANÁLISIS Y ALERTAS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Alertas de Inventario Crítico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Inventario Crítico
            </CardTitle>
            <CardDescription>Productos con stock menor a {threshold} unidades.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.criticalItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">Inventario saludable. ¡Buen trabajo!</p>
              ) : (
                stats.criticalItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-orange-50/20 border-orange-100">
                        <div className="space-y-1">
                            <p className="text-sm font-bold leading-none">
                                ¡Se te acaba {item.name}!
                            </p>
                            <p className="text-xs text-muted-foreground italic">¡Reponlo pronto!</p>
                        </div>
                        <Badge variant="destructive" className="font-mono">
                            {item.currentStock} unid.
                        </Badge>
                    </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Estrella de la Semana */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Productos Estrella (Semanal)
            </CardTitle>
            <CardDescription>Los más vendidos en los últimos 7 días.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">Aún no hay ventas esta semana.</p>
              ) : (
                stats.topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                            #{index + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Vendido {product.qty} veces</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            <ShoppingBag className="h-3 w-3" />
                            RECOMENDADO
                        </div>
                    </div>
                ))
              )}
            </div>
            {stats.topProducts.length > 0 && (
                <p className="mt-6 text-[10px] text-muted-foreground italic bg-muted p-2 rounded text-center">
                    💡 Consejo: Publica estos 5 productos en tus estados de WhatsApp hoy.
                </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
