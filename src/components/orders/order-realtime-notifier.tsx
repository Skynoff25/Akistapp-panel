
"use client";

import { useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { startOfDay } from 'date-fns';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

interface OrderRealtimeNotifierProps {
  storeId?: string;
  enabled: boolean;
}

export default function OrderRealtimeNotifier({ storeId, enabled }: OrderRealtimeNotifierProps) {
  const isInitialLoad = useRef(true);
  const audioContext = useRef<AudioContext | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const playAlertSound = () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContext.current;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Error al reproducir sonido:", e);
    }
  };

  const showNativeNotification = (order: Order) => {
    if (Notification.permission === 'granted') {
      new Notification('¡Nueva Orden Recibida! 🚀', {
        body: `${order.userName || 'Un cliente'} ha realizado un pedido de $${order.totalAmount.toFixed(2)}`,
        icon: '/akistapp_logo.png',
        tag: order.id,
      });
    }
  };

  const showUINotification = (order: Order) => {
    const ordersPath = storeId ? `/store/${storeId}/orders` : `/dashboard/orders`;
    
    toast({
      title: "🚀 ¡Nuevo Pedido Recibido!",
      description: `${order.userName || 'Cliente'} - Total: $${order.totalAmount.toFixed(2)}`,
      action: (
        <ToastAction altText="Ver pedido" onClick={() => router.push(ordersPath)}>
          Ver Pedido
        </ToastAction>
      ),
    });
  };

  useEffect(() => {
    if (!enabled) {
        isInitialLoad.current = true;
        return;
    }

    const startOfToday = startOfDay(new Date()).getTime();
    
    const constraints = [
      where('status', '==', 'PENDING'),
      where('createdAt', '>=', startOfToday),
    ];

    if (storeId) {
      constraints.push(where('storeId', '==', storeId));
    }

    const q = query(collection(db, 'Orders'), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newOrder = { id: change.doc.id, ...change.doc.data() } as Order;
          playAlertSound();
          showNativeNotification(newOrder);
          showUINotification(newOrder);
        }
      });
    }, (error) => {
      console.error("Firestore Error in Realtime Notifier:", error);
      if (error.code === 'failed-precondition') {
        toast({
          variant: "destructive",
          title: "Error de Base de Datos",
          description: "La consulta requiere un índice compuesto. Revisa la consola del navegador para crearlo.",
        });
      }
    });

    return () => unsubscribe();
  }, [enabled, storeId, toast, router]);

  return null;
}
