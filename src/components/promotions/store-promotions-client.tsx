"use client";

import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import type { Promotion } from "@/lib/types";
import { where } from "firebase/firestore";
import Loader from "@/components/ui/loader";
import { PageHeader } from "../ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "../ui/badge";

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
          {promotions.map((promo) => (
            <Card key={promo.id} className="overflow-hidden">
              <div className="relative">
                <Image
                  src={promo.imageUrl || `https://picsum.photos/seed/${promo.id}/600/300`}
                  alt={promo.title}
                  width={600}
                  height={300}
                  className="w-full h-40 object-cover"
                />
                 <Badge variant={promo.isActive ? "default" : "secondary"} className="absolute top-2 right-2">
                    {promo.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle>{promo.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{promo.content}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
