"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import type { StoreProduct, ProductVariant } from "@/lib/types";
import { updateStoreProduct } from "@/app/store/[storeId]/my-products/actions";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import { Label } from "../ui/label";
import { PlusCircle, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "../ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";

const variantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es obligatorio."),
  price: z.coerce.number().min(0, "El precio debe ser positivo."),
  stock: z.coerce.number().int("El stock debe ser un número entero.").min(0, "El stock no puede ser negativo."),
  sku: z.string().optional(),
});

const storeProductSchema = z.object({
  price: z.coerce.number().min(0, "El precio no puede ser negativo.").optional(),
  promotionalPrice: z.coerce.number().min(0, "El precio promocional no puede ser negativo.").optional().nullable(),
  currentStock: z.coerce.number().int('El stock debe ser un número entero.').min(0, 'El stock no puede ser negativo.').optional(),
  isAvailable: z.boolean(),
  storeSpecificImage: z.any().optional(),
  description: z.string().optional(),
  disclaimer: z.string().optional(),
  costPriceUsd: z.coerce.number().min(0, 'El costo no puede ser negativo.'),
  casheaEligible: z.boolean(),
  hasVariations: z.boolean(),
  variants: z.array(variantSchema).optional(),
}).superRefine((data, ctx) => {
    if (data.hasVariations) {
        if (!data.variants || data.variants.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["variants"],
                message: "Debes agregar al menos una variante.",
            });
        }
    } else {
        if (typeof data.price !== 'number') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "El precio es obligatorio." });
        }
        if (typeof data.currentStock !== 'number') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["currentStock"], message: "El stock es obligatorio." });
        }
    }
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
      price: 0,
      promotionalPrice: null,
      currentStock: 0,
      isAvailable: true,
      storeSpecificImage: "",
      description: "",
      disclaimer: "",
      costPriceUsd: 0,
      casheaEligible: false,
      hasVariations: false,
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const hasVariations = form.watch("hasVariations");

  useEffect(() => {
    if (product) {
        form.reset({
            price: product.price || 0,
            promotionalPrice: product.promotionalPrice || null,
            currentStock: product.currentStock || 0,
            isAvailable: product.isAvailable,
            storeSpecificImage: product.storeSpecificImage || "",
            description: product.description || "",
            disclaimer: product.disclaimer || "",
            costPriceUsd: product.costPriceUsd || 0,
            casheaEligible: product.casheaEligible || false,
            hasVariations: product.hasVariations || false,
            variants: product.variants || [],
        });
    }
  }, [product, form]);


  const onSubmit = async (data: StoreProductFormValues) => {
    const formData = new FormData();

    for (const key in data) {
        const typedKey = key as keyof StoreProductFormValues;
        const value = data[typedKey];

        if (typedKey === 'variants' && data.hasVariations && Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
        } else if (typedKey === 'storeSpecificImage' && value instanceof File) {
            formData.append(key, value);
        } else if (value !== undefined && value !== null && !(value instanceof File)) {
            formData.append(key, String(value));
        }
    }
    
    // If the image field is empty string (meaning user wants to remove it)
    if (data.storeSpecificImage === "") {
      formData.append('storeSpecificImage', '');
    }
    
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-1">

        <FormField
          control={form.control}
          name="hasVariations"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Este producto tiene variaciones?</FormLabel>
                <FormDescription>Ej: Tallas, colores, pesos, etc.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEditPrice} />
              </FormControl>
            </FormItem>
          )}
        />
        
        {hasVariations ? (
            <Card>
                <CardHeader>
                    <CardTitle>Variantes del Producto</CardTitle>
                    <CardDescription>Añade cada opción disponible de tu producto con su precio y stock específico.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                         {fields.map((field, index) => (
                             <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-4">
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-4">
                                            <FormLabel className="text-xs">Nombre</FormLabel>
                                            <FormControl><Input placeholder="Ej: Rojo, Talla M" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name={`variants.${index}.price`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel className="text-xs">Precio ($)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" placeholder="19.99" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.stock`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel className="text-xs">Stock</FormLabel>
                                            <FormControl><Input type="number" step="1" placeholder="50" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="col-span-2 flex justify-end pt-7">
                                     <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                         ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), name: '', price: 0, stock: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Variante
                        </Button>
                         {form.formState.errors.variants && <FormMessage>{form.formState.errors.variants.message}</FormMessage>}
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Precio</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" placeholder="19.99" className="pl-7" disabled={!canEditPrice} {...field} />
                            </div>
                        </FormControl>
                        {!canEditPrice && <FormDescription className="text-xs">Solo gerentes pueden editar.</FormDescription>}
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="promotionalPrice" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Precio Promocional</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" placeholder="14.99" className="pl-7" disabled={!canEditPrice} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                            </div>
                        </FormControl>
                        <FormDescription className="text-xs">Opcional. Dejar en blanco para quitar.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="currentStock" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Stock Actual</FormLabel>
                    <FormControl><Input type="number" step="1" placeholder="100" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
        )}
        
        <FormField
          control={form.control}
          name="storeSpecificImage"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Imagen Personalizada (Opcional)</FormLabel>
              <FormControl>
                <Input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file);
                    }}
                    {...rest}
                />
              </FormControl>
              <FormDescription>
                Si se deja en blanco, se usará la imagen global del producto. Sube un archivo para reemplazar la imagen actual.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción Personalizada (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe detalles específicos de este producto en tu tienda..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Esta descripción se mostrará en la página de tu producto. Si se deja en blanco, se usará la descripción global.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="disclaimer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aviso Legal / Descargo de Responsabilidad (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: La garantía es directamente con el fabricante." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Información importante que el cliente debe saber antes de comprar. Se mostrará debajo de la descripción.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="costPriceUsd"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Costo de Reposición (USD)</FormLabel>
              <FormControl>
                  <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                      <Input type="number" step="0.01" placeholder="10.50" className="pl-7" {...field} />
                  </div>
              </FormControl>
              <FormDescription className="text-xs">El costo real para reponer este producto.</FormDescription>
              <FormMessage />
              </FormItem>
          )}
          />

        <div className="space-y-4">
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

        <FormField
          control={form.control}
          name="casheaEligible"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Elegible para Financiamiento (Cashea)
                </FormLabel>
                <FormDescription>
                  Marcar si este producto se puede vender a través de financiamiento.
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
        </div>
        
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
