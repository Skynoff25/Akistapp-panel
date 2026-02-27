
"use client";

import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { where, orderBy } from "firebase/firestore";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import Loader from "@/components/ui/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function GlobalOrdersPage() {
  // Admin ve todas las órdenes de todos los stores
  const { data: orders, loading, error } = useFirestoreQuery<Order>("Orders", [
    orderBy("createdAt", "desc")
  ]);

  if (loading) return <Loader className="h-[50vh]" text="Cargando pedidos globales..." />;
  if (error) return <p className="text-destructive p-8 text-center">Error: {error.message}</p>;

  return (
    <>
      <PageHeader 
        title="Pedidos Globales" 
        description="Vista de administrador de todos los pedidos realizados en la plataforma." 
      />
      
      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">No hay pedidos registrados.</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id.substring(0, 7)}</TableCell>
                  <TableCell>{format(new Date(order.createdAt), 'dd/MM/yy HH:mm', { locale: es })}</TableCell>
                  <TableCell>{order.storeName || 'Tienda Desconocida'}</TableCell>
                  <TableCell>{order.userName || 'N/A'}</TableCell>
                  <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
