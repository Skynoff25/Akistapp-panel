"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { createProduct, updateProduct } from "@/app/dashboard/products/actions";
import type { Product } from "@/lib/types";
import { useEffect, useState } from "react";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { Copy, Link, Upload, PackageSearch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpTip } from "@/components/ui/help-tip";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  brand: z.string().min(1, "La marca es obligatoria"),
  description: z.string().min(1, "La descripción es obligatoria"),
  category: z.string().min(1, "La categoría es obligatoria"),
  image: z.any().optional(),
  imageUrl: z.string().optional(),
  tags: z.string().optional(),
  isGenericBrand: z.boolean().default(false),
  unit: z.enum(['UNIT', 'KG', 'GR', 'LB']).default('UNIT'),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const { data: allProducts } = useFirestoreQuery<Product>('Products');

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      description: "",
      category: "",
      image: "",
      imageUrl: "",
      tags: "",
      isGenericBrand: false,
      unit: "UNIT",
    },
  });

  const isGeneric = form.watch("isGenericBrand");

  useEffect(() => {
    if (isGeneric) {
      form.setValue("brand", "Genérico");
    }
  }, [isGeneric, form]);

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name ?? "",
        brand: product.brand ?? "",
        description: product.description ?? "",
        category: product.category ?? "",
        image: "",
        imageUrl: product.image?.startsWith('http') ? product.image : "",
        tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
        isGenericBrand: product.isGenericBrand || false,
        unit: product.unit || "UNIT",
      });
    }
  }, [product, form]);

  const handleClone = (productId: string) => {
    const source = allProducts.find(p => p.id === productId);
    if (source) {
      form.reset({
        ...form.getValues(),
        brand: source.brand,
        description: source.description,
        category: source.category,
        imageUrl: source.image,
        tags: Array.isArray(source.tags) ? source.tags.join(", ") : "",
        isGenericBrand: source.isGenericBrand || false,
      });
      toast({
        description: "Datos cargados desde el producto seleccionado.",
      });
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if(value !== undefined && key !== 'image' && key !== 'imageUrl') {
             formData.append(key, String(value));
        }
    });

    if (data.imageUrl) {
        formData.append('imageUrl', data.imageUrl);
    }
    if (data.image instanceof File) {
        formData.append('image', data.image);
    }

    form.clearErrors();
    
    const action = product ? updateProduct.bind(null, product.id) : createProduct;
    const result = await action(formData);
    
    if (result?.errors) {
        Object.entries(result.errors).forEach(([key, value]) => {
            if (key === '_form') {
                 form.setError("root.serverError", { message: (value as string[]).join(", ") });
            } else {
                 form.setError(key as keyof ProductFormValues, { message: (value as string[]).join(", ") });
            }
        });
    } else if (result?.message) {
        toast({
            title: product ? "Producto Actualizado" : "Producto Creado",
            description: result.message,
        });
        onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        
        {!product && allProducts.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-lg border border-dashed border-primary/30 mb-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-primary">
              <Copy className="h-3 w-3" />
              AUTOCOMPLETAR DESDE EXISTENTE
            </div>
            <Select onValueChange={handleClone}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Selecciona un producto para clonar datos..." />
              </SelectTrigger>
              <SelectContent>
                {allProducts.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.brand})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="Zapatos Deportivos Pro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isGenericBrand"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/10">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                  <PackageSearch className="h-4 w-4" />
                  ¿Producto genérico / marca variable?
                  <HelpTip text="Activa para frutas, verduras, o productos sin marca fija.\nLa app mostrará este campo como 'Genérico' en vez de una marca específica." />
                </FormLabel>
                <FormDescription className="text-xs">Si la marca no es relevante o varía constantemente.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem className={isGeneric ? "hidden" : "block"}>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input placeholder="Adidas, Nike..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className={isGeneric ? "col-span-2" : ""}>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input placeholder="Calzado, Ropa..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                Unidad de Medida
                <HelpTip text="Define cómo se vende este producto.\nUNIT = por pieza (default)\nKG / GR / LB = por peso\nAfecta el POS y el stock (permite decimales)." />
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="UNIT">Por Unidad (default)</SelectItem>
                  <SelectItem value="KG">Kilogramo (kg)</SelectItem>
                  <SelectItem value="GR">Gramo (gr)</SelectItem>
                  <SelectItem value="LB">Libra (lb)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">Para frutas, verduras o productos a granel, selecciona la unidad de peso.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles del producto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
            <FormLabel>Imagen del Producto</FormLabel>
            <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url" className="flex items-center gap-2"><Link className="h-3 w-3"/> URL</TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2"><Upload className="h-3 w-3"/> Subir</TabsTrigger>
                </TabsList>
                <TabsContent value="url">
                    <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">Pega un enlace directo a la imagen.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </TabsContent>
                <TabsContent value="upload">
                    <FormField
                        control={form.control}
                        name="image"
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

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiquetas (separadas por comas)</FormLabel>
              <FormControl>
                <Input placeholder="deporte, running, cuero" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {form.formState.errors.root?.serverError && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.serverError.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando..." : (product ? "Guardar Cambios" : "Guardar Producto")}
        </Button>
      </form>
    </Form>
  );
}
