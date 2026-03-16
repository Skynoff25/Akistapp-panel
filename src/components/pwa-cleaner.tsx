"use client";

import { useEffect } from 'react';

/**
 * Este componente se encarga de limpiar cualquier rastro de Service Workers
 * anteriores que puedan estar causando errores de carga de chunks (404)
 * debido a caches obsoletos.
 */
export function PWACleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // 1. Desregistrar todos los Service Workers
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Service Worker desregistrado con éxito.');
              // Opcional: Recargar si es necesario, pero suele ser mejor dejar que el usuario navegue
            }
          });
        }
      });

      // 2. Limpiar todas las caches de la Cache API
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    }
  }, []);

  return null;
}
