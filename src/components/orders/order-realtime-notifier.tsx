
"use client";

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { startOfDay } from 'date-fns';
import type { Order } from '@/lib/types';

interface OrderRealtimeNotifierProps {
  storeId?: string;
  enabled: boolean;
}

export default function OrderRealtimeNotifier({ storeId, enabled }: OrderRealtimeNotifierProps) {
  const isInitialLoad = useRef(true);
  const audioContext = useRef<AudioContext | null>(null);

  const playAlertSound = () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContext.current;
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
      const n = new Notification('¡Nueva Orden Recibida! 🚀', {
        body: `${order.userName || 'Un cliente'} ha realizado un pedido de $${order.totalAmount.toFixed(2)}`,
        icon: '/logo.png', // Asegúrate de tener un icono en public/logo.png
        tag: order.id,
      });
      
      n.onclick = () => {
        window.focus();
        // Podrías redirigir aquí si fuera necesario
      };
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const startOfToday = startOfDay(new Date()).getTime();
    
    // Construir query: Pendientes de hoy
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
        }
      });
    });

    return () => unsubscribe();
  }, [enabled, storeId]);

  return null; // Componente lógico invisible
}
