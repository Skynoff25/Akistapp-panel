"use client";

import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import type { Promotion } from "@/lib/types";
import { where } from "firebase/firestore";
import Loader from "@/components/ui/loader";
import { PageHeader } from "../ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { getImageUrl } from "@/lib/utils";
import { differenceInDays, formatDistanceToNow, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';

interface StorePromotionsClientProps {
  storeId: string;
}

export default function StorePromotionsClient({ storeId }: StorePromotionsClientProps) {
  const { data: promotions, loading, error } = useFirestoreQuery<Promotion>(
    "Promotions",
    [where("storeId", "==", storeId)]
  );

  if (loading) return <Loader className="h-[50vh]" text="Cargando promociones..." />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader
        title="Mis Promociones"
        description="Estas son las promociones y banners que el administrador ha creado para tu tienda."
      />

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Actualmente no tienes ninguna promoción activa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo) => {
            const now = new Date();
            const expiresAtDate = new Date(promo.expiresAt);
            const isExpired = isBefore(expiresAtDate, now);
            const daysUntilExpiration = differenceInDays(expiresAtDate, now);

            return(
              <Card key={promo.id} className="overflow-hidden flex flex-col">
                <div className="relative">
                  <Image
                    src={getImageUrl(promo.imageUrl, promo.id, 600, 300)}
                    alt={promo.title || 'Imagen de la promoción'}
                    width={600}
                    height={300}
                    className="w-full h-40 object-cover"
                  />
                  <Badge variant={promo.isActive && !isExpired ? "default" : "secondary"} className="absolute top-2 right-2">
                      {promo.isActive && !isExpired ? 'Activa' : (isExpired ? 'Expirada': 'Inactiva')}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle>{promo.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{promo.content}</CardDescription>
                </CardContent>
                 <CardFooter className="bg-muted/50 p-3 text-sm text-muted-foreground mt-auto">
                    {isExpired ? (
                        <div className="text-destructive font-semibold">Expirada</div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {daysUntilExpiration <= 3 && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                            <span>
                                Vence {formatDistanceToNow(expiresAtDate, { addSuffix: true, locale: es })}
                                {daysUntilExpiration <= 3 && <span className="font-semibold text-foreground"> (contacta al admin para extender)</span>}
                            </span>
                        </div>
                    )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </>
  );
}
