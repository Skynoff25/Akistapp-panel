"use client";

import { useSystemConfig } from '@/hooks/use-system-config';
import { AlertTriangle } from 'lucide-react';

export default function SystemEmergencyBanner() {
  const { config, loading } = useSystemConfig();

  if (loading || !config || !config.isAppBlocked) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-3 shadow-md flex items-center justify-center sticky top-0 z-50 animate-in slide-in-from-top-2">
      <AlertTriangle className="mr-2 h-5 w-5 animate-pulse" />
      <span className="font-semibold text-sm md:text-base">
        ⚠️ ATENCIÓN: LA APLICACIÓN MÓVIL ESTÁ ACTUALMENTE BLOQUEADA POR EMERGENCIA
      </span>
    </div>
  );
}
