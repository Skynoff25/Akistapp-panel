"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { where } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, CheckCircle2, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import type { Order, Store, AppUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AdminKpis() {
  const startOfToday = startOfDay(new Date()).getTime();
  
  const { data: todayOrders, loading: ordersLoading, refetch: refetchOrders } = useFirestoreQuery<Order>('Orders', [
    where('createdAt', '>=', startOfToday)
  ]);

  const { data: stores, loading: storesLoading, refetch: refetchStores } = useFirestoreQuery<Store>('Stores');
  
  const { data: activeUsers, loading: usersLoading, refetch: refetchUsers } = useFirestoreQuery<AppUser>('Users', [
    where('lastLoginAt', '>=', startOfToday)
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchOrders(), refetchStores(), refetchUsers()]);
    setIsRefreshing(false);
  };

  const stats = useMemo(() => {
    // 1. GMV Today
    const gmvToday = todayOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

    // 2. Estimated Own Income (Suscripciones prorrateadas)
    const planPrices = { BASIC: 5, STANDARD: 15, PREMIUM: 50 };
    const monthlyIncome = stores.reduce((acc, store) => acc + (planPrices[store.subscriptionPlan] || 0), 0);
    const dailyIncomeEstimated = monthlyIncome / 30;

    // 3. Order Completion Rate (DELIVERED / (DELIVERED + CANCELLED))
    const completed = todayOrders.filter(o => o.status === 'DELIVERED').length;
    const cancelled = todayOrders.filter(o => o.status === 'CANCELLED').length;
    const totalFinished = completed + cancelled;
    const completionRate = totalFinished > 0 ? (completed / totalFinished) * 100 : 100;

    return {
      gmvToday,
      dailyIncomeEstimated,
      completionRate,
      activeUsersCount: activeUsers.length,
      ordersCount: todayOrders.length
    };
  }, [todayOrders, stores, activeUsers]);

  const isLoading = ordersLoading || storesLoading || usersLoading || isRefreshing;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          KPIs de Hoy
          <span className="text-xs font-normal text-muted-foreground italic">(Actualizado: {new Date().toLocaleTimeString()})</span>
        </h3>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isLoading}
            className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Actualizar Estadísticas
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tarjeta GMV */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GMV Hoy (Ventas)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.gmvToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Suma de pedidos de hoy</p>
          </CardContent>
        </Card>

        {/* Tarjeta Ingresos Propios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Estimados</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.dailyIncomeEstimated.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Basado en suscripciones / día</p>
          </CardContent>
        </Card>

        {/* Tarjeta Tasa de Finalización */}
        <Card className={cn(stats.completionRate < 80 && stats.ordersCount > 0 ? "border-destructive bg-destructive/5" : "")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
            {stats.completionRate < 80 && stats.ordersCount > 0 ? (
                <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />
            ) : (
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.completionRate < 80 && stats.ordersCount > 0 ? "text-destructive" : "")}>
                {stats.completionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
                {stats.completionRate < 80 && stats.ordersCount > 0 ? "¡Bajo el 80%! Revisa logística." : "Salud del flujo de pedidos"}
            </p>
          </CardContent>
        </Card>

        {/* Tarjeta Usuarios Activos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos Hoy</CardTitle>
            <UserCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsersCount}</div>
            <p className="text-xs text-muted-foreground">Usuarios que han entrado hoy</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
