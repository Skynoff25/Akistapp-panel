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
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "../ui/label";
import { format } from "date-fns";
import { CalendarIcon, CreditCard } from "lucide-react";

const storeSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres."),
  zipcode: z.string().min(2, "El código postal debe tener al menos 2 caracteres."),
  address: z.string().min(2, "La dirección debe tener al menos 2 caracteres."),
  phone: z.string().min(2, "El teléfono debe tener al menos 2 caracteres."),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  imageUrl: z.any().optional(),
  subscriptionPlan: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
  allowPickup: z.boolean().default(false),
  allowDelivery: z.boolean().default(false),
  deliveryType: z.enum(['FIXED', 'AGREEMENT']).default('AGREEMENT'),
  deliveryFee: z.coerce.number().min(0).default(0),
  sponsoredKeywords: z.string().optional(),
  hasPos: z.boolean().default(false),
  hasFinanceModule: z.boolean().default(false),
  // Plan tracking
  planExpiresAt: z.string().optional(),
  lastPaymentAmount: z.coerce.number().optional(),
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
      planExpiresAt: store?.planExpiresAt ? format(new Date(store.planExpiresAt), 'yyyy-MM-dd') : '',
      lastPaymentAmount: store?.lastPaymentAmount || 0,
    },
  });

  useEffect(() => {
    if (store) {
        form.reset({
            name: store.name,
            city: store.city,
            zipcode: store.zipcode,
            address: store.address,
            phone: store.phone,
            latitude: store.latitude,
            longitude: store.longitude,
            imageUrl: store.imageUrl,
            subscriptionPlan: store.subscriptionPlan,
            allowPickup: store.allowPickup,
            allowDelivery: store.allowDelivery,
            deliveryType: store.deliveryType,
            deliveryFee: store.deliveryFee,
            sponsoredKeywords: store.sponsoredKeywords?.join(', '),
            hasPos: store.hasPos,
            hasFinanceModule: store.hasFinanceModule,
            planExpiresAt: store.planExpiresAt ? format(new Date(store.planExpiresAt), 'yyyy-MM-dd') : '',
            lastPaymentAmount: store.lastPaymentAmount,
        });
    }
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
      if (key === 'imageUrl' && value instanceof File) {
        formData.append(key, value);
      } else if (key !== 'imageUrl' && value !== undefined) {
         formData.append(key, String(value));
      }
    });

    const action = store ? updateStore.bind(null, store.id) : createStore;
    const result = await action(formData);
    
    if (result?.errors) {
        toast({ variant: 'destructive', title: 'Error', description: 'Revisa los campos del formulario.' });
    } else {
        toast({ title: store ? "Tienda Actualizada" : "Tienda Creada", description: result.message });
        onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto p-1">
        
        <FormField
          control={form.control}
          name="subscriptionPlan"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Plan de Suscripción</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {planOptions.map(plan => (
                    <FormItem key={plan.value}>
                      <FormControl><RadioGroupItem value={plan.value} className="sr-only" /></FormControl>
                      <FormLabel className="cursor-pointer">
                        <Card className={cn("p-4 transition-all", field.value === plan.value ? "border-primary ring-2 ring-primary" : "hover:border-muted-foreground/50")}>
                            <div className="font-bold">{plan.title}</div>
                            <div className="text-lg font-semibold text-primary">{plan.price}</div>
                            <ul className="mt-2 text-[10px] text-muted-foreground space-y-1">
                                {plan.features.map((feature, i) => <li key={i}>• {feature}</li>)}
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

        <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
                <CreditCard className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm font-bold text-orange-800">Control de Pagos y Expiración</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="planExpiresAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Fecha de Vencimiento</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" {...field} className="pl-8" />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastPaymentAmount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Monto Último Pago ($)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {store?.lastPaymentDate && (
                    <div className="col-span-2 text-[10px] text-muted-foreground text-right italic">
                        Último pago registrado el: {format(new Date(store.lastPaymentDate), 'dd/MM/yyyy HH:mm')}
                    </div>
                )}
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Tienda Increíble" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="555-123-4567" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Calle Principal 123" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input placeholder="Metrópolis" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="zipcode" render={({ field }) => (
                <FormItem><FormLabel>CP</FormLabel><FormControl><Input placeholder="12345" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        <FormField control={form.control} name="sponsoredKeywords" render={({ field }) => (
            <FormItem>
                <FormLabel>Top Search (Keywords)</FormLabel>
                <FormControl><Input placeholder="batería, caucho, aceite" {...field} /></FormControl>
                <FormDescription className="text-[10px]">Separadas por comas.</FormDescription>
                <FormMessage />
            </FormItem>
        )} />

        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Configuración de Logística y Módulos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="allowPickup" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-xs">Permitir Retiro</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isBasicPlan} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="allowDelivery" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-xs">Permitir Delivery</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isBasicPlan} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="hasPos" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/20">
                        <FormLabel className="text-xs font-bold">Módulo POS</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="hasFinanceModule" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/20">
                        <FormLabel className="text-xs font-bold">Módulo Finanzas</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
            </div>
        </div>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando..." : "Guardar Tienda"}
        </Button>
      </form>
    </Form>
  );
}
