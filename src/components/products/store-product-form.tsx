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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { StoreProduct, ProductVariant } from "@/lib/types";
import { updateStoreProduct } from "@/app/store/[storeId]/my-products/actions";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { PlusCircle, Trash2, Wand2, Zap, Link, Upload, Copy } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "../ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  storeSpecificImageUrl: z.string().optional(),
  description: z.string().optional(),
  disclaimer: z.string().optional(),
  costPriceUsd: z.coerce.number().min(0, 'El costo no puede ser negativo.').optional(),
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

  // Estados locales para la configuración de generación por lotes
  const [batchPrice, setBatchPrice] = useState<number>(0);
  const [batchStock, setBatchStock] = useState<number>(1);

  const form = useForm<StoreProductFormValues>({
    resolver: zodResolver(storeProductSchema),
    defaultValues: {
      price: 0,
      promotionalPrice: null,
      currentStock: 0,
      isAvailable: true,
      storeSpecificImage: "",
      storeSpecificImageUrl: "",
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
            storeSpecificImage: "",
            storeSpecificImageUrl: product.storeSpecificImage?.startsWith('http') ? product.storeSpecificImage : "",
            description: product.description || "",
            disclaimer: product.disclaimer || "",
            costPriceUsd: product.costPriceUsd || 0,
            casheaEligible: product.casheaEligible || false,
            hasVariations: product.hasVariations || false,
            variants: product.variants || [],
        });
        // Sincronizar el precio base con el batchPrice inicial si es 0
        if (product.price > 0 && batchPrice === 0) {
            setBatchPrice(product.price);
        }
    }
  }, [product, form]);

  const generateBatchVariants = (type: 'shoes' | 'shoes_half' | 'clothing' | 'pants') => {
    let names: string[] = [];

    switch (type) {
      case 'shoes':
        for (let i = 35; i <= 45; i++) names.push(`Talla ${i}`);
        break;
      case 'shoes_half':
        for (let i = 35; i <= 45; i++) {
          names.push(`Talla ${i}`);
          names.push(`Talla ${i}.5`);
        }
        break;
      case 'clothing':
        names = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
        break;
      case 'pants':
        for (let i = 28; i <= 42; i += 2) names.push(`Talla ${i}`);
        break;
    }

    const newVariants = names.map(name => ({
      id: crypto.randomUUID(),
      name,
      price: batchPrice,
      stock: batchStock,
    }));

    newVariants.forEach(v => append(v));
    
    toast({
        description: `Se han añadido ${newVariants.length} variantes con precio $${batchPrice} y stock ${batchStock}.`,
    });
  };

  const handleDuplicateVariant = (index: number) => {
    const variantToCopy = fields[index];
    append({
        ...variantToCopy,
        id: crypto.randomUUID(),
        name: `${variantToCopy.name} (Copia)`,
    });
    toast({
        description: "Variante duplicada.",
    });
  };


  const onSubmit = async (data: StoreProductFormValues) => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'storeSpecificImage' && key !== 'storeSpecificImageUrl') {
            if (key === 'variants') {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        }
    });

    if (data.storeSpecificImageUrl) {
        formData.append('storeSpecificImageUrl', data.storeSpecificImageUrl);
    }
    if (data.storeSpecificImage instanceof File) {
        formData.append('storeSpecificImage', data.storeSpecificImage);
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
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <FormLabel className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Manejar Variantes
                </FormLabel>
                <FormDescription>Ej: Tallas, colores, pesos, etc.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEditPrice} />
              </FormControl>
            </FormItem>
          )}
        />
        
        {hasVariations ? (
            <Card className="border-primary/20">
                <CardHeader className="pb-3 border-b mb-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">Variantes del Producto</CardTitle>
                          <CardDescription>Configura opciones específicas.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="h-6">Total: {fields.length}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-md border border-dashed">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Precio Inicial</Label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-muted-foreground text-xs">$</span>
                            <Input 
                              type="number" 
                              className="h-8 text-xs pl-5" 
                              value={batchPrice} 
                              onChange={(e) => setBatchPrice(Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Stock Inicial</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-xs" 
                            value={batchStock} 
                            onChange={(e) => setBatchStock(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Generación Rápida</Label>
                          <Select onValueChange={(v) => generateBatchVariants(v as any)}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Añadir Lote..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shoes">Zapatos (35-45)</SelectItem>
                              <SelectItem value="shoes_half">Zapatos (+.5)</SelectItem>
                              <SelectItem value="clothing">Ropa (XS-3XL)</SelectItem>
                              <SelectItem value="pants">Pantalones (28-42)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                         {fields.length === 0 ? (
                            <p className="text-center py-8 text-sm text-muted-foreground italic">
                              No hay variantes. Usa el generador de arriba o añade una manual.
                            </p>
                         ) : fields.map((field, index) => (
                             <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-4 last:border-0 hover:bg-muted/10 transition-colors px-1">
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-4">
                                            <FormLabel className="text-[10px] uppercase text-muted-foreground font-semibold">Opción</FormLabel>
                                            <FormControl><Input className="h-8 text-xs" placeholder="Ej: Rojo, Talla M" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name={`variants.${index}.price`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel className="text-[10px] uppercase text-muted-foreground font-semibold">Precio ($)</FormLabel>
                                            <FormControl><Input className="h-8 text-xs" type="number" step="0.01" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.stock`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel className="text-[10px] uppercase text-muted-foreground font-semibold">Stock</FormLabel>
                                            <FormControl><Input className="h-8 text-xs" type="number" step="1" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="col-span-3 flex justify-end pt-6 gap-1">
                                     <Button variant="ghost" size="icon" type="button" onClick={() => handleDuplicateVariant(index)} className="text-primary h-8 w-8" title="Duplicar">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                     <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} className="text-destructive h-8 w-8" title="Eliminar">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                         ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), name: '', price: batchPrice, stock: batchStock })} className="w-full border-dashed mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Variante Manual
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Precio Base</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" placeholder="19.99" className="pl-7" disabled={!canEditPrice} {...field} />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="promotionalPrice" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Precio Oferta</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" placeholder="14.99" className="pl-7" disabled={!canEditPrice} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="currentStock" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Stock Total</FormLabel>
                    <FormControl><Input type="number" step="1" placeholder="100" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
        )}
        
        <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
            <h3 className="font-semibold text-sm">Imagen Específica de Tienda</h3>
            <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url" className="flex items-center gap-2"><Link className="h-3 w-3"/> URL</TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2"><Upload className="h-3 w-3"/> Subir</TabsTrigger>
                </TabsList>
                <TabsContent value="url">
                    <FormField
                        control={form.control}
                        name="storeSpecificImageUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">Si se deja vacío, se usará la imagen global del catálogo.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </TabsContent>
                <TabsContent value="upload">
                    <FormField
                        control={form.control}
                        name="storeSpecificImage"
                        render={({ field: { onChange, value, ...rest } }) => (
                            <FormItem>
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
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </TabsContent>
            </Tabs>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
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
                <FormMessage />
                </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción Personalizada</FormLabel>
              <FormControl>
                <Textarea className="min-h-[100px]" placeholder="Describe detalles específicos para tu tienda..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="disclaimer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aviso / Garantía</FormLabel>
              <FormControl>
                <Textarea className="min-h-[60px]" placeholder="Ej: Garantía de 3 meses por defectos de fábrica." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isAvailable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5"><FormLabel className="text-sm">Disponible</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="casheaEligible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5"><FormLabel className="text-sm">Cashea</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}
          />
        </div>
        
        {form.formState.errors.root?.serverError && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.serverError.message}
          </p>
        )}

        <Button type="submit" className="w-full py-6" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando..." : "Finalizar y Guardar"}
        </Button>
      </form>
    </Form>
  );
}
