
"use client";

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useDocument } from '@/hooks/use-document';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import type { Store, StoreProduct } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Package, DollarSign, Store as StoreIcon, Loader2 } from 'lucide-react';
import Loader from '@/components/ui/loader';
import { where } from 'firebase/firestore';
import { PromotionalCarousel } from '@/components/products/promotional-carousel';
import { StoreKpis } from '@/components/dashboard/store-kpis';

function StatCard({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: React.ElementType, loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StoreDashboardPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { appUser } = useAuth();
  const { data: store, loading: storeLoading } = useDocument<Store>(`Stores/${storeId}`);
  const { data: storeProducts, loading: productsLoading } = useFirestoreQuery<StoreProduct>('Inventory', [where('storeId', '==', storeId)]);

  const averagePrice = useMemo(() => {
    if (!storeProducts || storeProducts.length === 0) return 0;
    const total = storeProducts.reduce((acc, p) => acc + p.price, 0);
    return total / storeProducts.length;
  }, [storeProducts]);

  if (storeLoading) {
    return <Loader text="Cargando panel de tienda..." />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={store?.name || 'Dashboard de Tienda'}
        description={`¡Bienvenido, ${appUser?.name || 'Gerente'}!`}
      />

      {/* NUEVA SECCIÓN DE KPIs OPERATIVOS */}
      <StoreKpis storeId={storeId} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
            title="Estado de la Tienda" 
            value={store?.isOpen ? 'Abierta' : 'Cerrada'} 
            icon={StoreIcon} 
            loading={storeLoading} 
        />
        <StatCard 
            title="Productos en Tienda" 
            value={`${storeProducts.length} / ${store?.maxProducts || '...'}`}
            icon={Package} 
            loading={productsLoading || storeLoading} 
        />
        <StatCard 
            title="Precio Promedio" 
            value={`$${averagePrice.toFixed(2)}`} 
            icon={DollarSign} 
            loading={productsLoading} 
        />
      </div>

      <PromotionalCarousel products={storeProducts} />

       <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Primeros Pasos</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Este es tu panel de administración de la tienda. Esto es lo que puedes hacer:
                </p>
                <ul className="list-disc pl-5 mt-4 space-y-2 text-sm text-muted-foreground">
                    <li>Navega usando la barra lateral a la izquierda.</li>
                    <li><span className="font-semibold text-foreground">Gestionar Mi Tienda:</span> Actualiza la imagen y el estado de apertura de tu tienda.</li>
                    <li><span className="font-semibold text-foreground">Gestionar Mis Productos:</span> Añade productos del catálogo global a tu tienda y gestiona su precio, disponibilidad e imagen.</li>
                </ul>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
