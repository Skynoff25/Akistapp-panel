"use client";

import { useState } from "react";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { where } from "firebase/firestore";
import type { StoreCoupon } from "@/lib/types";
import { PageHeader } from "../ui/page-header";
import Loader from "../ui/loader";
import { Button } from "../ui/button";
import { PlusCircle, Trash2, Tag, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { CouponForm } from "./coupon-form";
import { toggleCouponStatus, deleteCoupon } from "@/app/store/[storeId]/coupons/actions";
import { useToast } from "@/hooks/use-toast";

export default function CouponClient({ storeId }: { storeId: string }) {
  const { data: coupons, loading, error, refetch } = useFirestoreQuery<StoreCoupon>("Coupons", [
    where("storeId", "==", storeId)
  ]);
  const [isOpen, setOpen] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (coupon: StoreCoupon) => {
    const res = await toggleCouponStatus(storeId, coupon.id, !coupon.isActive);
    if (res.success) toast({ title: "Estado actualizado" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este cupón?")) {
        const res = await deleteCoupon(storeId, id);
        if (res.success) toast({ title: "Cupón eliminado" });
    }
  };

  if (loading) return <Loader className="h-[50vh]" />;

  return (
    <>
      <PageHeader title="Cupones de Descuento" description="Crea y gestiona códigos promocionales para tus clientes.">
        <Button onClick={() => setOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Cupón</Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {coupons.length === 0 ? (
            <Card className="col-span-full py-12 text-center text-muted-foreground italic border-dashed">
                Aún no tienes cupones creados. ¡Crea el primero para incentivar tus ventas!
            </Card>
        ) : coupons.map(coupon => {
            const isExpired = Date.now() > coupon.expirationDate;
            return (
                <Card key={coupon.id} className={!coupon.isActive || isExpired ? "opacity-60 bg-muted/30" : "border-primary/20"}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className="text-lg font-mono tracking-widest px-3 py-1 bg-primary/5 border-primary/20">
                                {coupon.code}
                            </Badge>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(coupon.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardTitle className="text-2xl mt-4">
                            {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue.toFixed(2)} OFF`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Vence: {format(new Date(coupon.expirationDate), "dd/MM/yy", { locale: es })}</span>
                            {isExpired && <Badge variant="destructive" className="ml-auto text-[10px]">EXPIRADO</Badge>}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs font-medium uppercase text-muted-foreground">Estado</span>
                            <Button 
                                variant={coupon.isActive && !isExpired ? "outline" : "secondary"} 
                                size="sm"
                                onClick={() => handleToggle(coupon)}
                                disabled={isExpired}
                                className="h-8 gap-2"
                            >
                                {coupon.isActive ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-600" />}
                                {coupon.isActive ? "Activo" : "Inactivo"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Crear Nuevo Cupón</DialogTitle>
            </DialogHeader>
            <CouponForm storeId={storeId} onSuccess={() => { setOpen(false); refetch(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
