"use client";

import { useState, useEffect } from 'react';
import { startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, CheckCircle2, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAdminKpisStats } from '@/app/dashboard/admin-actions';
import { useToast } from '@/hooks/use-toast';

export function AdminKpis() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    gmvToday: 0,
    dailyIncomeEstimated: 0,
    completionRate: 100,
    activeUsersCount: 0,
    ordersCount: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    setIsLoading(true);
    const startOfTodayMs = startOfDay(new Date()).getTime();
    try {
      const res = await getAdminKpisStats(startOfTodayMs);
      if (res.success && res.data) {
          setStats(prev => ({ ...prev, ...res.data }));
          setLastUpdated(new Date());
      } else {
          toast({ variant: 'destructive', title: 'Error', description: res.error || 'Failed to load KPIs' });
      }
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          KPIs de Hoy
          <span className="text-xs font-normal text-muted-foreground italic">(Actualizado: {lastUpdated.toLocaleTimeString()})</span>
        </h3>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats} 
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
            <div className="text-2xl font-bold">${(stats.gmvToday || 0).toFixed(2)}</div>
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
            <div className="text-2xl font-bold">${(stats.dailyIncomeEstimated || 0).toFixed(2)}</div>
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
                {(stats.completionRate || 0).toFixed(1)}%
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
