
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Store } from "@/lib/types";
import { useEffect } from "react";
import { PageHeader } from "../ui/page-header";
import { useDocument } from "@/hooks/use-document";
import Loader from "../ui/loader";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { updateMyStore } from "@/app/store/[storeId]/my-store/actions";
import { Switch } from "../ui/switch";
import Image from "next/image";
import { Label } from "../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { getImageUrl } from "@/lib/utils";

const myStoreSchema = z.object({
  imageUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal('')),
  isOpen: z.boolean(),
  allowPickup: z.boolean(),
  allowDelivery: z.boolean(),
  deliveryType: z.enum(['FIXED', 'AGREEMENT']).default('AGREEMENT'),
  deliveryFee: z.coerce.number().min(0).default(0),
});

type MyStoreFormValues = z.infer<typeof myStoreSchema>;

interface MyStoreClientProps {
  storeId: string;
}

export default function MyStoreClient({ storeId }: MyStoreClientProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const { data: store, loading, error } = useDocument<Store>(`Stores/${storeId}`);

  const form = useForm<MyStoreFormValues>({
    resolver: zodResolver(myStoreSchema),
    defaultValues: {
      imageUrl: store?.imageUrl || "",
      isOpen: store?.isOpen || true,
      allowPickup: store?.allowPickup || false,
      allowDelivery: store?.allowDelivery || false,
      deliveryType: store?.deliveryType || 'AGREEMENT',
      deliveryFee: store?.deliveryFee || 0,
    },
  });

  const isBasicPlan = store?.subscriptionPlan === 'BASIC';
  const allowDelivery = form.watch('allowDelivery');
  const allowPickup = form.watch('allowPickup');
  const deliveryType = form.watch('deliveryType');

  useEffect(() => {
    if (store) {
      form.reset({
        imageUrl: store.imageUrl || "",
        isOpen: store.isOpen,
        allowPickup: store.allowPickup,
        allowDelivery: store.allowDelivery,
        deliveryType: store.deliveryType || 'AGREEMENT',
        deliveryFee: store.deliveryFee || 0,
      });
    }
  }, [store, form]);

  const onSubmit = async (data: MyStoreFormValues) => {
    const formData = new FormData();
    formData.append('imageUrl', data.imageUrl || '');
    formData.append('isOpen', String(data.isOpen));
    formData.append('allowPickup', String(data.allowPickup));
    formData.append('allowDelivery', String(data.allowDelivery));
    if (data.deliveryType) {
      formData.append('deliveryType', data.deliveryType);
    }
    if (data.deliveryFee !== undefined) {
        formData.append('deliveryFee', String(data.deliveryFee));
    }


    const result = await updateMyStore(storeId, formData);
    
    if (result?.errors) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Hubo un problema al actualizar la tienda.",
        });
    } else {
        toast({
            title: "Tienda Actualizada",
            description: result.message,
        });
    }
  };

  if (loading) return <Loader className="h-[50vh]" text="Cargando información de la tienda..."/>;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!store) return <p>No se encontró la tienda.</p>;

  const canEdit = appUser?.rol === 'store_manager' || appUser?.rol === 'admin';

  return (
    <>
      <PageHeader title="Mi Tienda" description="Gestiona la información y configuración de tu tienda." />
      
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="storeName">Nombre de la tienda</Label>
                            <Input id="storeName" value={store.name} disabled />
                            <p className="text-sm text-muted-foreground">El nombre de la tienda solo puede ser cambiado por un administrador.</p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="storeAddress">Dirección</Label>
                            <Input id="storeAddress" value={`${store.address}, ${store.city}, ${store.zipcode}`} disabled />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Configuración de Pedidos y Visibilidad</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>URL del Logo/Imagen</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-4">
                                        <Image src={getImageUrl(field.value || store.imageUrl, store.id)} alt={store.name || 'Logo de la tienda'} width={64} height={64} className="rounded-lg object-cover" />
                                        <Input placeholder="https://example.com/logo.png" {...field} disabled={!canEdit}/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="isOpen"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                    Tienda Abierta
                                    </FormLabel>
                                    <FormDescription>
                                    Permite que los clientes vean y compren en tu tienda. Desactívalo para un cierre temporal.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={!canEdit}
                                    />
                                </FormControl>
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
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={!canEdit || isBasicPlan}
                                    />
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
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={!canEdit || isBasicPlan}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />

                        {isBasicPlan && (
                            <p className="text-sm text-muted-foreground px-1">
                                Tu plan Básico no incluye las opciones de retiro o despacho. Para activarlas, por favor contacta al administrador para mejorar tu plan.
                            </p>
                        )}

                        {allowDelivery && !isBasicPlan && (
                            <div className="space-y-4 rounded-lg border p-4">
                                <h4 className="font-medium">Configuración de Despacho</h4>
                                <FormField
                                    control={form.control}
                                    name="deliveryType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                        <FormLabel>Tipo de Tarifa</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                            disabled={!canEdit}
                                            >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="AGREEMENT" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                A Convenir con la tienda
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="FIXED" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                Tarifa Fija
                                                </FormLabel>
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
                                                        <Input 
                                                            type="number" 
                                                            step="0.01" 
                                                            placeholder="5.00" 
                                                            className="pl-7"
                                                            disabled={!canEdit}
                                                            {...field} 
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        )}

                        {!allowPickup && !allowDelivery && !isBasicPlan && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>¡Atención!</AlertTitle>
                                <AlertDescription>
                                    Al tener ambas opciones de retiro y despacho desactivadas, los clientes no podrán realizar pedidos en tu tienda.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                
                {canEdit ? (
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                ) : (
                    <p className="text-sm text-muted-foreground">Solo los gerentes de tienda pueden editar esta información.</p>
                )}
            </form>
            </Form>
        </div>
        <div className="md:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Plan de Suscripción</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Plan actual</Label>
                        <p className="font-semibold text-primary text-lg">{store.subscriptionPlan}</p>
                    </div>
                     <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Límite de productos</Label>
                        <p className="font-semibold">{store.maxProducts}</p>
                    </div>
                     <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Permite reservas</Label>
                        <p className="font-semibold">{store.allowReservations ? "Sí" : "No"}</p>
                    </div>
                     <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Retiro / Despacho</Label>
                        <p className="font-semibold">{store.allowPickup || store.allowDelivery ? "Sí" : "No"}</p>
                    </div>
                    <p className="text-sm text-muted-foreground pt-2">Para cambiar de plan, contacta con el soporte.</p>
                </CardContent>
             </Card>
        </div>
      </div>
    </>
  );
}
