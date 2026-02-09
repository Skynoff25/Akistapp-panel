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
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sendPushNotification } from "./actions";
import { Send } from "lucide-react";


const notificationSchema = z.object({
  title: z.string().min(1, "El título es obligatorio."),
  message: z.string().min(1, "El mensaje es obligatorio."),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function NotificationsPage() {
  const { toast } = useToast();

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      message: "",
    },
  });

  const onSubmit = async (data: NotificationFormValues) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('message', data.message);
    
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
        description="Envía mensajes a todos los usuarios de la aplicación."
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
