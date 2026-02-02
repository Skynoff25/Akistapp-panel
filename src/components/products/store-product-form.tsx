"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { StoreProduct } from "@/lib/types";
import { updateStoreProduct } from "@/app/store/[storeId]/my-products/actions";
import { useAuth } from "@/context/auth-context";

const storeProductSchema = z.object({
  price: z.coerce.number().min(0, "El precio no puede ser negativo."),
  promotionalPrice: z.coerce.number().min(0, "El precio promocional no puede ser negativo.").optional().nullable(),
  currentStock: z.coerce.number().int('El stock debe ser un número entero.').min(0, 'El stock no puede ser negativo.'),
  isAvailable: z.boolean(),
  storeSpecificImage: z.string().url("Debe ser una URL válida").optional().or(z.literal('')),
});

type StoreProductFormValues = z.infer<typeof storeProductSchema>;

interface StoreProductFormProps {
  storeId: string;
  product: StoreProduct;
  onSuccess: () => void;
}

export function StoreProductForm({ storeId, product, onSuccess }: StoreProductFormProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const canEditPrice = appUser?.rol === 'store_manager' || appUser?.rol === 'admin';

  const form = useForm<StoreProductFormValues>({
    resolver: zodResolver(storeProductSchema),
    defaultValues: {
      price: product.price || 0,
      promotionalPrice: product.promotionalPrice || null,
      currentStock: product.currentStock || 0,
      isAvailable: product.isAvailable,
      storeSpecificImage: product.storeSpecificImage || "",
    },
  });

  const onSubmit = async (data: StoreProductFormValues) => {
    const formData = new FormData();
    formData.append('price', String(data.price));
    if (data.promotionalPrice) {
      formData.append('promotionalPrice', String(data.promotionalPrice));
    }
    formData.append('currentStock', String(data.currentStock));
    formData.append('isAvailable', String(data.isAvailable));
    formData.append('storeSpecificImage', data.storeSpecificImage || '');
    
    const result = await updateStoreProduct(storeId, product.id, formData);
    
    if (result?.errors) {
        if (result.errors._form) {
            form.setError("root.serverError", { message: result.errors._form.join(", ") });
        } else {
             Object.entries(result.errors).forEach(([key, value]) => {
                form.setError(key as keyof StoreProductFormValues, { message: value?.join(", ") });
            });
        }
    } else {
        toast({
            title: "Producto Actualizado",
            description: `El producto "${product.name}" ha sido actualizado en tu tienda.`,
        });
        onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Precio</FormLabel>
                <FormControl>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="19.99" 
                            className="pl-7"
                            disabled={!canEditPrice}
                            {...field} 
                        />
                    </div>
                </FormControl>
                {!canEditPrice && <FormDescription className="text-xs">Solo gerentes pueden editar.</FormDescription>}
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
              control={form.control}
              name="promotionalPrice"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Precio Promocional</FormLabel>
                  <FormControl>
                      <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                          <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="14.99" 
                              className="pl-7"
                              disabled={!canEditPrice}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          />
                      </div>
                  </FormControl>
                  <FormDescription className="text-xs">Opcional. Dejar en blanco para quitar.</FormDescription>
                  <FormMessage />
                  </FormItem>
              )}
            />
        </div>
        
        <FormField
            control={form.control}
            name="currentStock"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Stock Actual</FormLabel>
                <FormControl>
                     <Input 
                        type="number" 
                        step="1" 
                        placeholder="100" 
                        {...field} 
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        
        <FormField
          control={form.control}
          name="storeSpecificImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Imagen Personalizada (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="https://ejemplo.com/mi-foto.png" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Si se deja en blanco, se usará la imagen global del producto.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Disponible para la venta
                </FormLabel>
                <FormDescription>
                  Si está desactivado, los clientes no podrán ver ni comprar este producto en tu tienda.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {form.formState.errors.root?.serverError && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.serverError.message}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
