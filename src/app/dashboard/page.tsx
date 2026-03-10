"use client";

import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestoreSubscription } from '@/hooks/use-firestore-subscription';
import { Store, Package, Users, Loader2 } from 'lucide-react';
import type { Store as StoreType, Product, AppUser } from '@/lib/types';
import { AdminKpis } from '@/components/dashboard/admin-kpis';

function StatCard({ title, value, icon: Icon, loading }: { title: string, value: number, icon: React.ElementType, loading: boolean }) {
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


export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stores, loading: storesLoading } = useFirestoreSubscription<StoreType>('Stores');
  const { data: products, loading: productsLoading } = useFirestoreSubscription<Product>('Products');
  const { data: users, loading: usersLoading } = useFirestoreSubscription<AppUser>('Users');


  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`¡Bienvenido de nuevo, ${user?.displayName || 'Admin'}!`}
      />

      <AdminKpis />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Tiendas Totales" value={stores.length} icon={Store} loading={storesLoading} />
        <StatCard title="Productos Totales" value={products.length} icon={Package} loading={productsLoading} />
        <StatCard title="Usuarios Totales" value={users.length} icon={Users} loading={usersLoading} />
      </div>

       <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Primeros Pasos</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Este es tu panel de administración de Akistapp. Esto es lo que puedes hacer:
                </p>
                <ul className="list-disc pl-5 mt-4 space-y-2 text-sm text-muted-foreground">
                    <li>Navega usando la barra lateral a la izquierda.</li>
                    <li><span className="font-semibold text-foreground">Gestionar Tiendas:</span> Añade, visualiza, edita y elimina la información de las tiendas.</li>
                    <li><span className="font-semibold text-foreground">Aprobaciones:</span> Revisa y autoriza solicitudes de los empleados (ej. eliminar productos) para mantener la seguridad.</li>
                    <li><span className="font-semibold text-foreground">Ver Productos:</span> Navega por el catálogo global con búsqueda instantánea y sin consumo de datos.</li>
                    <li><span className="font-semibold text-foreground">Finanzas y Cupones:</span> Monitorea las ventas del día, el rendimiento de las tiendas y crea códigos de descuento.</li>
                    <li><span className="font-semibold text-foreground">Ver Usuarios:</span> Mira una lista de todos los administradores, gerentes y consumidores en la aplicación.</li>
                    <li><span className="font-semibold text-foreground">💡 Instalar como App:</span> Si usas Google Chrome, puedes instalar este panel desde la barra de direcciones para usarlo más rápido y resistente a caídas de internet.</li>
                </ul>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
