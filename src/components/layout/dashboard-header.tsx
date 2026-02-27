
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import OrderRealtimeNotifier from '../orders/order-realtime-notifier';

interface DashboardHeaderProps {
  storeId?: string;
}

const ALERTS_STORAGE_KEY = 'akistapp_alerts_enabled';

export default function DashboardHeader({ storeId }: DashboardHeaderProps) {
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const { toast } = useToast();

  // Cargar estado inicial desde localStorage al montar el componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(ALERTS_STORAGE_KEY);
      // Solo activamos automáticamente si el usuario lo pidió antes Y tiene permisos otorgados
      if (savedState === 'true' && Notification.permission === 'granted') {
        setAlertsEnabled(true);
      }
    }
  }, []);

  const toggleAlerts = async () => {
    if (!alertsEnabled) {
      // Solicitar permiso de notificaciones
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setAlertsEnabled(true);
        localStorage.setItem(ALERTS_STORAGE_KEY, 'true');
        toast({
          title: "Alertas Activas",
          description: "Recibirás una notificación y sonido cuando entre un nuevo pedido.",
        });
      } else {
        localStorage.setItem(ALERTS_STORAGE_KEY, 'false');
        toast({
          variant: "destructive",
          title: "Permiso Denegado",
          description: "Debes permitir las notificaciones en tu navegador para usar esta función.",
        });
      }
    } else {
      setAlertsEnabled(false);
      localStorage.setItem(ALERTS_STORAGE_KEY, 'false');
      toast({
        description: "Alertas en tiempo real desactivadas.",
      });
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {storeId ? 'Panel de Tienda' : 'Panel de Administración'}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant={alertsEnabled ? "default" : "outline"} 
          size="sm" 
          onClick={toggleAlerts}
          className="gap-2"
        >
          {alertsEnabled ? (
            <>
              <Volume2 className="h-4 w-4" />
              <Bell className="h-4 w-4" />
              Alertas Activas
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4" />
              <BellOff className="h-4 w-4" />
              Activar Alertas
            </>
          )}
        </Button>
      </div>

      <OrderRealtimeNotifier storeId={storeId} enabled={alertsEnabled} />
    </header>
  );
}
