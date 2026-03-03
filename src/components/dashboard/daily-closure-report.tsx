"use client";

import { useMemo } from 'react';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import { where, orderBy } from 'firebase/firestore';
import { startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow,
    TableFooter
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Download, ShoppingCart, Calculator, FileText, AlertCircle } from 'lucide-react';
import type { Order } from '@/lib/types';
import Loader from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DailyClosureReportProps {
  storeId: string;
}

interface SummarizedItem {
    productId: string;
    productName: string;
    variantLabel: string;
    totalQuantity: number;
    totalRevenue: number;
}

export function DailyClosureReport({ storeId }: DailyClosureReportProps) {
  const start = startOfDay(new Date()).getTime();
  const end = endOfDay(new Date()).getTime();

  // Consultar órdenes entregadas hoy
  const { data: orders, loading, error } = useFirestoreQuery<Order>('Orders', [
    where('storeId', '==', storeId),
    where('status', '==', 'DELIVERED'),
    where('createdAt', '>=', start),
    where('createdAt', '<=', end)
  ]);

  const { summarizedItems, totalGrossAmount, totalOrders } = useMemo(() => {
    if (!orders || orders.length === 0) return { summarizedItems: [], totalGrossAmount: 0, totalOrders: 0 };

    const itemMap = new Map<string, SummarizedItem>();
    let grossAmount = 0;

    orders.forEach(order => {
        grossAmount += order.finalTotal || order.totalAmount;
        
        order.items.forEach(item => {
            const key = item.variantId ? `${item.inventoryId}-${item.variantId}` : item.inventoryId;
            const existing = itemMap.get(key);

            if (existing) {
                existing.totalQuantity += item.quantity;
                existing.totalRevenue += (item.price * item.quantity);
            } else {
                itemMap.set(key, {
                    productId: item.productId,
                    productName: item.productName,
                    variantLabel: item.variantName || 'Base',
                    totalQuantity: item.quantity,
                    totalRevenue: (item.price * item.quantity)
                });
            }
        });
    });

    return {
        summarizedItems: Array.from(itemMap.values()),
        totalGrossAmount: grossAmount,
        totalOrders: orders.length
    };
  }, [orders]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (summarizedItems.length === 0) return;

    const headers = ["Producto", "Variante", "Cantidad Total", "Total ($)"];
    const rows = summarizedItems.map(item => [
        `"${item.productName}"`,
        `"${item.variantLabel}"`,
        item.totalQuantity.toString(),
        item.totalRevenue.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cierre_ventas_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <Loader text="Generando consolidado diario..." />;

  if (error) {
    return (
        <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar el cierre</AlertTitle>
            <AlertDescription>
                Hubo un problema al consultar las ventas de hoy. Por favor, asegúrate de que los índices de la base de datos estén listos.
                <br/> Detalle: {error.message}
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6 print:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Cierre de Turno Diario
            </h2>
            <p className="text-sm text-muted-foreground">
                Resumen consolidado de productos para registro en sistema administrativo (Saint/Valery).
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={summarizedItems.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Reporte
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={summarizedItems.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 no-print">
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Órdenes Procesadas
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">Pedidos entregados hoy</p>
            </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-200">
            <CardHeader className="pb-2 text-green-700">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Venta Bruta Total
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-green-600">${totalGrossAmount.toFixed(2)}</div>
                <p className="text-xs text-green-600/70 mt-1">Suma de todos los pagos recibidos</p>
            </CardContent>
        </Card>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:pb-6">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-lg">Detalle de Productos Vendidos (Consolidado)</CardTitle>
                    <CardDescription className="no-print">
                        Suma total por producto para carga masiva en inventario.
                    </CardDescription>
                </div>
                <div className="hidden print:block text-right">
                    <h1 className="text-2xl font-bold text-primary">AkistApp</h1>
                    <p className="text-xs text-muted-foreground">Reporte de Cierre Diario</p>
                </div>
            </div>
            <div className="hidden print:grid grid-cols-3 gap-4 text-xs mt-6 border p-4 rounded-lg">
                <div>
                    <p className="font-bold uppercase text-muted-foreground">Fecha del Reporte</p>
                    <p className="text-sm">{format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div>
                    <p className="font-bold uppercase text-muted-foreground">Venta Total</p>
                    <p className="text-sm font-bold">${totalGrossAmount.toFixed(2)}</p>
                </div>
                <div>
                    <p className="font-bold uppercase text-muted-foreground">Total Pedidos</p>
                    <p className="text-sm">{totalOrders}</p>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 font-bold">
                        <TableHead className="text-foreground">Producto</TableHead>
                        <TableHead className="text-foreground">Variante</TableHead>
                        <TableHead className="text-center text-foreground">Cant. Total</TableHead>
                        <TableHead className="text-right text-foreground">Monto Bruto ($)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {summarizedItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center italic text-muted-foreground">
                                No se han registrado ventas hoy todavía.
                            </TableCell>
                        </TableRow>
                    ) : (
                        summarizedItems.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-medium">{item.productName}</TableCell>
                                <TableCell>{item.variantLabel}</TableCell>
                                <TableCell className="text-center font-bold">{item.totalQuantity}</TableCell>
                                <TableCell className="text-right">${item.totalRevenue.toFixed(2)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
                {summarizedItems.length > 0 && (
                    <TableFooter>
                        <TableRow className="bg-muted/30 font-bold">
                            <TableCell colSpan={2} className="text-right uppercase">Total Consolidado:</TableCell>
                            <TableCell className="text-center">
                                {summarizedItems.reduce((acc, i) => acc + i.totalQuantity, 0)} items
                            </TableCell>
                            <TableCell className="text-right text-primary text-lg">
                                ${totalGrossAmount.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
            
            <div className="hidden print:block mt-12 border-t pt-8">
                <div className="grid grid-cols-2 gap-8 text-center">
                    <div className="space-y-12">
                        <div className="border-t border-black w-48 mx-auto"></div>
                        <p className="text-[10px] font-bold">FIRMA CAJERO / RESPONSABLE</p>
                    </div>
                    <div className="space-y-12">
                        <div className="border-t border-black w-48 mx-auto"></div>
                        <p className="text-[10px] font-bold">FIRMA GERENTE / ADMINISTRADOR</p>
                    </div>
                </div>
                <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest mt-12">
                    Documento de Control Interno - Generado por AkistApp
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
