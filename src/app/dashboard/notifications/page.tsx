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
  FormDescription
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sendPushNotification } from "./actions";
import { Send, Users, Store, User } from "lucide-react";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import type { Store as StoreType, AppUser } from "@/lib/types";
import Loader from "@/components/ui/loader";


const notificationSchema = z.object({
  title: z.string().min(1, "El título es obligatorio."),
  message: z.string().min(1, "El mensaje es obligatorio."),
  targetType: z.enum(['all', 'user', 'store'], { required_error: "Debes seleccionar un tipo de destinatario."}),
  targetValue: z.string().optional(),
}).refine(data => {
    if ((data.targetType === 'user' || data.targetType === 'store') && !data.targetValue) {
        return false;
    }
    return true;
}, {
    message: "Debes seleccionar un destinatario específico.",
    path: ['targetValue'],
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function NotificationsPage() {
  const { toast } = useToast();
  const { data: stores, loading: storesLoading } = useFirestoreQuery<StoreType>('Stores');
  const { data: users, loading: usersLoading } = useFirestoreQuery<AppUser>('Users');

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      message: "",
      targetType: "all",
    },
  });

  const targetType = form.watch("targetType");

  const onSubmit = async (data: NotificationFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value);
      }
    });
    
    const result = await sendPushNotification(formData);

    if (result?.errors) {
      Object.entries(result.errors).forEach(([key, value]) => {
        form.setError(key as keyof NotificationFormValues, {
          message: (value as string[]).join(", "),
        });
      });
    } else {
      toast({
        title: "Notificación Enviada",
        description: result.message,
      });
      form.reset();
    }
  };

  return (
    <>
      <PageHeader
        title="Enviar Notificaciones Push"
        description="Envía mensajes a todos los usuarios de la aplicación o a un grupo específico."
      />
      <div className="max-w-2xl">
        <Card>
            <CardHeader>
                <CardTitle>Componer Notificación</CardTitle>
                <CardDescription>El mensaje llegará a los dispositivos de los usuarios que tengan las notificaciones activadas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                >
                    <FormField
                      control={form.control}
                      name="targetType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Enviar a:</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col sm:flex-row gap-4"
                            >
                              <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="all" /></FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><Users /> Todos los Usuarios</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="user" /></FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><User /> Usuario Específico</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="store" /></FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><Store /> Usuarios de una Tienda</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {targetType === 'user' && (
                        <FormField
                            control={form.control}
                            name="targetValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Seleccionar Usuario</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={usersLoading}>
                                         <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Busca y selecciona un usuario..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {usersLoading ? <Loader /> : users.map(user => (
                                                <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                     {targetType === 'store' && (
                        <FormField
                            control={form.control}
                            name="targetValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Seleccionar Tienda</FormLabel>
                                    <FormDescription>Se enviará a todos los usuarios que siguen esta tienda.</FormDescription>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={storesLoading}>
                                         <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Busca y selecciona una tienda..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {storesLoading ? <Loader /> : stores.map(store => (
                                                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                            <Input placeholder="¡Nueva Oferta Especial!" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Mensaje</FormLabel>
                        <FormControl>
                            <Textarea placeholder="No te pierdas nuestros descuentos de hasta 50%..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Enviando..." : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Notificación
                        </>
                      )}
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
