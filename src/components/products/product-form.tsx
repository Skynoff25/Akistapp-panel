"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createProduct, updateProduct } from "@/app/dashboard/products/actions";
import type { Product } from "@/lib/types";
import { useEffect } from "react";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  brand: z.string().min(1, "La marca es obligatoria"),
  description: z.string().min(1, "La descripción es obligatoria"),
  category: z.string().min(1, "La categoría es obligatoria"),
  image: z.any().optional(),
  tags: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      description: "",
      category: "",
      image: "",
      tags: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name ?? "",
        brand: product.brand ?? "",
        description: product.description ?? "",
        category: product.category ?? "",
        image: product.image ?? "",
        tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      });
    } else {
      form.reset({
        name: "",
        brand: "",
        description: "",
        category: "",
        image: "",
        tags: "",
      });
    }
  }, [product, form]);


  const onSubmit = async (data: ProductFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if(value !== undefined) {
             formData.append(key, String(value));
        }
    });

    if (data.image instanceof File) {
        formData.set('image', data.image);
    } else if (!product) {
        formData.delete('image');
    } else {
        // For updates, if no new file is selected, we should not send an empty string
        // The server action will handle keeping the old image.
        formData.delete('image');
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="Auriculares Inalámbricos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca</FormLabel>
              <FormControl>
                <Input placeholder="NombreDeLaMarca" {...field} />
              </FormControl>
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
                <Textarea placeholder="Auriculares inalámbricos de alta calidad..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <FormControl>
                <Input placeholder="Electrónica" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
            control={form.control}
            name="image"
            render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                <FormLabel>Imagen del Producto</FormLabel>
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
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiquetas (separadas por comas)</FormLabel>
              <FormControl>
                <Input placeholder="audio, inalámbrico, bluetooth" {...field} />
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

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando..." : (product ? "Guardar Cambios" : "Guardar Producto")}
        </Button>
      </form>
    </Form>
  );
}
