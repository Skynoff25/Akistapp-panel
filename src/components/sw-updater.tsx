"use client";
import { useEffect } from "react";

/**
 * Detecta cuando el Service Worker recibe una actualización y fuerza
 * una recarga de página para aplicar el nuevo SW (y sus assets) inmediatamente.
 * Esto evita que el admin vea la app sin estilos tras un nuevo deploy.
 */
export function SwUpdater() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  return null;
}
