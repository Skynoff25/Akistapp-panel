"use client";

import React, { useRef } from 'react';
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Printer, Download, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { useDocument } from '@/hooks/use-document';
import type { Order, Store } from '@/lib/types';
import Loader from '@/components/ui/loader';

interface OrderReceiptProps {
  order: Order;
}

export function OrderReceipt({ order }: OrderReceiptProps) {
  const { data: store, loading } = useDocument<Store>(`Stores/${order.storeId}`);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowPrint = window.open('', '', 'width=900,height=900');
    if (!windowPrint) return;

    windowPrint.document.write('<html><head><title>Comprobante de Pedido</title>');
    windowPrint.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    windowPrint.document.write('<style>@media print { .no-print { display: none; } }</style>');
    windowPrint.document.write('</head><body>');
    windowPrint.document.write(printContent.innerHTML);
    windowPrint.document.write('</body></html>');
    windowPrint.document.close();
    
    setTimeout(() => {
      windowPrint.focus();
      windowPrint.print();
      windowPrint.close();
    }, 500);
  };

  if (loading) return <Loader text="Generando comprobante..." />;

  const finalTotalUsd = order.finalTotal || (order.totalAmount + order.shippingCost);
  const totalVes = finalTotalUsd * (order.tasaOficial || 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2 no-print">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div ref={printRef} className="bg-white p-8 border rounded-lg shadow-sm text-slate-900 font-sans printable-receipt">
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              {store?.name || order.storeName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
              {store?.address}, {store?.city}<br />
              Tel: {store?.phone}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-500">Nota de Entrega</h2>
            <p className="text-sm font-mono font-bold">#ORD-{order.id.substring(0, 8).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">
              Fecha: {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Datos del Cliente</h3>
            <p className="text-sm font-semibold">{order.userName || 'Cliente General'}</p>
            {order.userNationalId && <p className="text-xs">C.I./RIF: {order.userNationalId}</p>}
            {order.userPhoneNumber && <p className="text-xs">Tel: {order.userPhoneNumber}</p>}
            {order.deliveryAddress && (
                <div className="mt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Dirección de Entrega</p>
                    <p className="text-xs">{order.deliveryAddress}</p>
                </div>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Método de Operación</h3>
            <p className="text-sm font-semibold">
                {order.type === 'IN_STORE' ? 'Venta en Tienda (POS)' : 'Pedido Online'}
            </p>
            {order.type !== 'IN_STORE' && (
                <p className="text-xs">
                    {order.deliveryMethod === 'PICKUP' ? 'Retiro en Local' : 
                     order.deliveryMethod === 'DELIVERY' ? 'Envío a Domicilio' : 'N/A'}
                </p>
            )}
          </div>
        </div>

        <div className="mb-8 border rounded-md overflow-x-auto border-slate-100">
          <Table className="min-w-[400px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-slate-900 font-bold">Descripción</TableHead>
                <TableHead className="text-center text-slate-900 font-bold">Cant.</TableHead>
                <TableHead className="text-right text-slate-900 font-bold">P. Unit</TableHead>
                <TableHead className="text-right text-slate-900 font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="py-2">
                    <p className="font-medium text-sm">{item.productName}</p>
                    {item.variantName && <p className="text-[10px] text-slate-500 italic">{item.variantName}</p>}
                  </TableCell>
                  <TableCell className="text-center py-2">{item.quantity}</TableCell>
                  <TableCell className="text-right py-2">${item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right py-2 font-semibold">${(item.price * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-full max-w-[250px] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium">${order.totalAmount.toFixed(2)}</span>
            </div>
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery:</span>
                <span className="font-medium">${order.shippingCost.toFixed(2)}</span>
              </div>
            )}
            {order.couponCode && (
              <div className="flex justify-between text-sm text-primary">
                <span>Cupón ({order.couponCode}):</span>
                <span>-${(order.couponDiscount || 0).toFixed(2)}</span>
              </div>
            )}
            {order.manualDiscount && order.manualDiscount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Descuento Manual:</span>
                <span>-${order.manualDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
              <span>Total Final USD:</span>
              <span>${finalTotalUsd.toFixed(2)}</span>
            </div>
            
            {order.tasaOficial && (
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100 mt-4 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 italic">
                        <span>Tasa BCV Referencial:</span>
                        <span>{order.tasaOficial.toFixed(2)} Bs/$</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-700">
                        <span>Total Bs:</span>
                        <span>{totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
                    </div>
                </div>
            )}
          </div>
        </div>

        {store?.paymentMethods && store.paymentMethods.length > 0 && order.status === 'PENDING' && (
            <div className="border-t pt-6 mb-6">
                <h3 className="text-sm font-bold uppercase text-slate-900 mb-2">Información para el Pago</h3>
                <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded border border-slate-100 italic">Antes de realizar el pago contactate con la empresa para corroborar los montos.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {store.paymentMethods.filter(pm => pm.isActive).map(pm => (
                        <div key={pm.id} className="text-[10px] bg-slate-50 p-3 border border-slate-100 rounded-md">
                            <span className="font-bold text-slate-800 block text-xs mb-1">{pm.type}</span>
                            <span className="text-slate-600 whitespace-pre-wrap leading-tight block">{pm.details}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="border-t pt-6 text-center">
          <p className="text-[11px] font-bold text-slate-600 mb-1">
            ESTE DOCUMENTO ES UN COMPROBANTE DE PEDIDO INTERNO.
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">
            La factura fiscal reglamentaria será entregada por la tienda junto con sus productos físicamente.<br />
            Gracias por confiar en AkistApp para sus compras.
          </p>
        </div>
      </div>
    </div>
  );
}
