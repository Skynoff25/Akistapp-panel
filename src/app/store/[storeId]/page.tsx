
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
import { DailyClosureReport } from '@/components/dashboard/daily-closure-report';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const storeId = params?.storeId as string;
  if (!storeId) return <Loader text="Cargando tienda..." />;
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

      <Tabs defaultValue="overview" className="space-y-8">
        <div className="flex justify-center sm:justify-start overflow-x-auto pb-2 no-print">
            <TabsList className="grid w-full grid-cols-2 max-w-[500px] h-14 p-1.5 bg-muted/50 rounded-xl border border-border/50">
                <TabsTrigger 
                    value="overview" 
                    className="rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md"
                >
                    Resumen Operativo
                </TabsTrigger>
                <TabsTrigger 
                    value="closure" 
                    className="rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md"
                >
                    Cierre de Ventas (Diario)
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 duration-500">
            {/* KPIs OPERATIVOS */}
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

            <div className="mt-8 no-print">
                <Card className="border-dashed bg-muted/20">
                    <CardHeader>
                        <CardTitle className="text-lg">Primeros Pasos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
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
        </TabsContent>

        <TabsContent value="closure" className="animate-in fade-in-50 duration-500">
            <DailyClosureReport storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
