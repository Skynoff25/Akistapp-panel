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
import type { Promotion, Store } from "@/lib/types";
import { createPromotion, updatePromotion } from "@/app/dashboard/promotions/actions";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import Loader from "../ui/loader";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";

const promotionSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  content: z.string().min(1, "El contenido es obligatorio"),
  imageUrl: z.any().optional(),
  storeId: z.string().min(1, "Debes seleccionar una tienda"),
  cityId: z.string().min(1, "El código postal es obligatorio"),
  isActive: z.boolean(),
  expiresAt: z.date({
    required_error: "La fecha de caducidad es obligatoria.",
  }),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
  promotion?: Promotion | null;
  onSuccess: () => void;
}

export function PromotionForm({ promotion, onSuccess }: PromotionFormProps) {
  const { toast } = useToast();
  const { data: stores, loading: storesLoading } = useFirestoreQuery<Store>("Stores");

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      title: promotion?.title || "",
      content: promotion?.content || "",
      imageUrl: promotion?.imageUrl || "",
      storeId: promotion?.storeId || "",
      cityId: promotion?.cityId || "",
      isActive: promotion?.isActive ?? true,
      expiresAt: promotion?.expiresAt ? new Date(promotion.expiresAt) : undefined,
    },
  });

  const onSubmit = async (data: PromotionFormValues) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.imageUrl instanceof File) {
        formData.append('imageUrl', data.imageUrl);
    }
    formData.append('storeId', data.storeId);
    formData.append('cityId', data.cityId);
    formData.append('isActive', String(data.isActive));
    if (data.expiresAt) {
      formData.append('expiresAt', data.expiresAt.toISOString());
    }

    const action = promotion ? updatePromotion.bind(null, promotion.id) : createPromotion;
    const result = await action(formData);

    if (result?.errors) {
      Object.entries(result.errors).forEach(([key, value]) => {
        form.setError(key as keyof PromotionFormValues, {
          message: (value as string[]).join(", "),
        });
      });
       if(result.errors._form) {
          form.setError("root.serverError", { message: result.errors._form.join(", ") });
       }
    } else {
      toast({
        title: promotion ? "Promoción Actualizada" : "Promoción Creada",
        description: result.message,
      });
      onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 max-h-[70vh] overflow-y-auto p-1"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="storeId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tienda Asociada</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={storesLoading}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una tienda" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {storesLoading ? (
                        <div className="flex items-center justify-center p-4">
                        <Loader text="Cargando tiendas..." />
                        </div>
                    ) : (
                        stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                            {store.name}
                        </SelectItem>
                        ))
                    )}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="cityId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ciudad (Código Postal)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej: 1010" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                        Este es el código postal para segmentar la promoción.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>
        
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Promoción</FormLabel>
              <FormControl>
                <Input placeholder="¡Descuentos de Verano!" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenido / Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Aprovecha nuestros descuentos..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="expiresAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Caducidad</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: es })
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0,0,0,0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Imagen del Banner</FormLabel>
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
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Promoción Activa</FormLabel>
                <FormDescription>
                  Si está desactivada, no será visible en la app.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
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
          {form.formState.isSubmitting ? "Guardando..." : "Guardar Promoción"}
        </Button>
      </form>
    </Form>
  );
}
