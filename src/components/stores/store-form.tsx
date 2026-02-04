"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Store, SubscriptionPlan } from "@/lib/types";
import { createStore, updateStore } from "@/app/dashboard/stores/actions";
import { useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "../ui/card";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "../ui/label";

const storeSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres."),
  zipcode: z.string().min(2, "El código postal debe tener al menos 2 caracteres."),
  address: z.string().min(2, "La dirección debe tener al menos 2 caracteres."),
  phone: z.string().min(2, "El teléfono debe tener al menos 2 caracteres."),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  imageUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal('')),
  subscriptionPlan: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
  allowPickup: z.boolean().default(false),
  allowDelivery: z.boolean().default(false),
  deliveryType: z.enum(['FIXED', 'AGREEMENT']).default('AGREEMENT'),
  deliveryFee: z.coerce.number().min(0).default(0),
  sponsoredKeywords: z.string().optional(),
  hasPos: z.boolean().default(false),
  hasFinanceModule: z.boolean().default(false),
});

type StoreFormValues = z.infer<typeof storeSchema>;

interface StoreFormProps {
  store?: Store | null;
  onSuccess: () => void;
}

const planOptions: { value: SubscriptionPlan, title: string, price: string, features: string[] }[] = [
    { value: 'BASIC', title: 'Vitrina Digital', price: '$5/mes', features: ['20 Productos', 'Sin Reservas', 'No Destacado', 'Sin Envíos/Retiros'] },
    { value: 'STANDARD', title: 'Venta Activa', price: '$15/mes', features: ['200 Productos', 'Permite Reservas', 'No Destacado'] },
    { value: 'PREMIUM', title: 'Supermercado', price: '$50/mes', features: ['10,000 Productos', 'Permite Reservas', 'Destacado'] },
];

export function StoreForm({ store, onSuccess }: StoreFormProps) {
  const { toast } = useToast();
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: store?.name || "",
      city: store?.city || "",
      zipcode: store?.zipcode || "",
      address: store?.address || "",
      phone: store?.phone || "",
      latitude: store?.latitude || 0.0,
      longitude: store?.longitude || 0.0,
      imageUrl: store?.imageUrl || "",
      subscriptionPlan: store?.subscriptionPlan || 'BASIC',
      allowPickup: store?.allowPickup || false,
      allowDelivery: store?.allowDelivery || false,
      deliveryType: store?.deliveryType || 'AGREEMENT',
      deliveryFee: store?.deliveryFee || 0,
      sponsoredKeywords: store?.sponsoredKeywords?.join(', ') || '',
      hasPos: store?.hasPos || false,
      hasFinanceModule: store?.hasFinanceModule || false,
    },
  });

  useEffect(() => {
    form.reset({
        name: store?.name || "",
        city: store?.city || "",
        zipcode: store?.zipcode || "",
        address: store?.address || "",
        phone: store?.phone || "",
        latitude: store?.latitude || 0.0,
        longitude: store?.longitude || 0.0,
        imageUrl: store?.imageUrl || "",
        subscriptionPlan: store?.subscriptionPlan || 'BASIC',
        allowPickup: store?.allowPickup || false,
        allowDelivery: store?.allowDelivery || false,
        deliveryType: store?.deliveryType || 'AGREEMENT',
        deliveryFee: store?.deliveryFee || 0,
        sponsoredKeywords: store?.sponsoredKeywords?.join(', ') || '',
        hasPos: store?.hasPos || false,
        hasFinanceModule: store?.hasFinanceModule || false,
    });
  }, [store, form]);

  const selectedPlan = form.watch("subscriptionPlan");
  const isBasicPlan = selectedPlan === 'BASIC';
  const allowDelivery = form.watch("allowDelivery");
  const deliveryType = form.watch("deliveryType");


  useEffect(() => {
    if (isBasicPlan) {
      form.setValue('allowPickup', false);
      form.setValue('allowDelivery', false);
    }
  }, [isBasicPlan, form]);


  const onSubmit = async (data: StoreFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const action = store ? updateStore.bind(null, store.id) : createStore;
    const result = await action(formData);
    
    if (result?.errors) {
        // This part is for server-side validation errors, not implemented in this version
    } else {
        toast({
            title: store ? "Tienda Actualizada" : "Tienda Creada",
            description: `La tienda "${data.name}" se ha guardado exitosamente.`,
        });
        onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        
        <FormField
          control={form.control}
          name="subscriptionPlan"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Plan de Suscripción</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  {planOptions.map(plan => (
                    <FormItem key={plan.value}>
                      <FormControl>
                          <RadioGroupItem value={plan.value} className="sr-only" />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        <Card className={cn(
                            "p-4 transition-all",
                             field.value === plan.value ? "border-primary ring-2 ring-primary" : "hover:border-muted-foreground/50"
                        )}>
                            <div className="font-bold">{plan.title}</div>
                            <div className="text-lg font-semibold text-primary">{plan.price}</div>
                            <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                                {plan.features.map((feature, i) => <li key={i}>{feature}</li>)}
                            </ul>
                        </Card>
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Tienda Increíble" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Calle Principal 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <FormControl>
                <Input placeholder="Metrópolis" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="zipcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código Postal</FormLabel>
              <FormControl>
                <Input placeholder="12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="555-123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
            <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
                <FormItem className="w-1/2">
                <FormLabel>Latitud</FormLabel>
                <FormControl>
                    <Input type="number" step="any" placeholder="40.7128" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
                <FormItem className="w-1/2">
                <FormLabel>Longitud</FormLabel>
                <FormControl>
                    <Input type="number" step="any" placeholder="-74.0060" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la Imagen</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/logo.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sponsoredKeywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Palabras Clave Patrocinadas ("Top Search")</FormLabel>
              <FormControl>
                <Input placeholder="batería, caucho, aceite" {...field} />
              </FormControl>
              <FormDescription>
                Palabras separadas por comas. La tienda aparecerá primero en las búsquedas de estas palabras.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowPickup"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Permitir Retiro en Tienda</FormLabel>
                <FormDescription>Los clientes podrán realizar pedidos para recoger en el local.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isBasicPlan} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowDelivery"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Permitir Despacho a Domicilio</FormLabel>
                <FormDescription>Tu tienda podrá recibir pedidos para enviar a domicilio.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isBasicPlan} />
              </FormControl>
            </FormItem>
          )}
        />

         {allowDelivery && !isBasicPlan && (
            <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium text-sm">Configuración de Despacho</h4>
                <FormField
                    control={form.control}
                    name="deliveryType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Tipo de Tarifa</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="AGREEMENT" id="admin-agreement" /></FormControl>
                                    <Label htmlFor="admin-agreement" className="font-normal">A Convenir</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="FIXED" id="admin-fixed" /></FormControl>
                                    <Label htmlFor="admin-fixed" className="font-normal">Tarifa Fija</Label>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {deliveryType === 'FIXED' && (
                    <FormField
                        control={form.control}
                        name="deliveryFee"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Monto de Tarifa Fija</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                        <Input type="number" step="0.01" placeholder="5.00" className="pl-7" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
        )}
        
        <div className="space-y-4">
            <h3 className="text-md font-medium text-foreground">Módulos Adicionales</h3>
            <FormField
                control={form.control}
                name="hasPos"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                    <FormLabel className="text-base">Punto de Venta (POS)</FormLabel>
                    <FormDescription>Habilita el módulo para registrar ventas en tienda.</FormDescription>
                    </div>
                    <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="hasFinanceModule"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                    <FormLabel className="text-base">Módulo de Finanzas</FormLabel>
                    <FormDescription>Habilita el módulo "Finanzas Reales" para esta tienda.</FormDescription>
                    </div>
                    <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                </FormItem>
                )}
            />
        </div>


        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando..." : "Guardar Tienda"}
        </Button>
      </form>
    </Form>
  );
}
