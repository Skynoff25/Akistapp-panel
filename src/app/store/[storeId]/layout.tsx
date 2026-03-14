"use client";

import StoreSidebar from '@/components/layout/store-sidebar';
import DashboardHeader from '@/components/layout/dashboard-header';
import { useDocument } from '@/hooks/use-document';
import type { Store } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import { isBefore, differenceInDays } from 'date-fns';
import { useParams } from 'next/navigation';

export default function StoreDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const storeId = params?.storeId as string;
  if (!storeId) return null;
  const { data: store } = useDocument<Store>(`Stores/${storeId}`);

  const checkPlanStatus = () => {
    if (!store?.planExpiresAt) return null;
    const now = Date.now();
    const expiryDate = new Date(store.planExpiresAt);
    const expired = isBefore(expiryDate, now);
    const daysLeft = differenceInDays(expiryDate, now);

    if (expired) {
        return { type: 'expired', message: 'Tu plan ha vencido. Algunas funciones podrían estar limitadas. Contacta al administrador para renovar.' };
    }
    if (daysLeft <= 7) {
        return { type: 'warning', message: `Tu plan vence en ${daysLeft} días. Contacta al administrador para realizar el pago.` };
    }
    return null;
  };

  const planStatus = checkPlanStatus();

  return (
    <div className="flex min-h-screen">
      <StoreSidebar storeId={storeId} />
      <div className="flex-1 flex flex-col">
        <DashboardHeader storeId={storeId} />
        <main className="p-4 sm:p-6 md:p-8 bg-background flex-1 flex flex-col">
          {planStatus && (
            <Alert variant={planStatus.type === 'expired' ? 'destructive' : 'default'} className="mb-6 border-orange-500 bg-orange-50 text-orange-900">
                <AlertTriangle className={planStatus.type === 'expired' ? 'h-4 w-4' : 'h-4 w-4 text-orange-600'} />
                <AlertTitle className="font-bold">{planStatus.type === 'expired' ? '¡PLAN VENCIDO!' : 'Aviso de Vencimiento'}</AlertTitle>
                <AlertDescription className="text-sm">
                    {planStatus.message}
                </AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
