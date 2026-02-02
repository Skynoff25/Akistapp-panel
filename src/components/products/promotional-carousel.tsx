'use client';

import type { StoreProduct } from '@/lib/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';

interface PromotionalCarouselProps {
  products: StoreProduct[];
}

export function PromotionalCarousel({ products }: PromotionalCarouselProps) {
  const promotionalProducts = products.filter(p => p.promotionalPrice && p.promotionalPrice > 0 && p.isAvailable);

  if (promotionalProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold mb-4">Productos en Oferta</h3>
      <Carousel
        opts={{
          align: 'start',
          loop: promotionalProducts.length > 3,
        }}
        className="w-full"
      >
        <CarouselContent>
          {promotionalProducts.map((product) => (
            <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                    <Image
                      src={getImageUrl(product.storeSpecificImage || product.globalImage, product.productId, 200, 200)}
                      alt={product.name}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover aspect-square"
                    />
                    <h4 className="font-semibold text-center h-10">{product.name}</h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-destructive">${product.promotionalPrice?.toFixed(2)}</span>
                      <span className="text-sm line-through text-muted-foreground">${product.price.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}
