"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/lib/types";
import { createReport } from "@/app/dashboard/reports/actions";
import { Input } from "../ui/input";

const reportSchema = z.object({
  reason: z.string().min(1, "El motivo es obligatorio."),
  comments: z.string().min(10, "Los comentarios deben tener al menos 10 caracteres."),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface ReportUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  reporterId: string;
  onSuccess: () => void;
}

export function ReportUserDialog({ isOpen, onOpenChange, order, reporterId, onSuccess }: ReportUserDialogProps) {
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: "", comments: "" },
  });

  const onSubmit = async (data: ReportFormValues) => {
    const formData = new FormData();
    formData.append("reportedBy", reporterId);
    formData.append("reportedUserId", order.userId);
    formData.append("reportedUserName", order.userName || "");
    formData.append("reportedUserEmail", order.userEmail || "");
    formData.append("orderId", order.id);
    formData.append("reason", data.reason);
    formData.append("comments", data.comments);
    
    const result = await createReport(formData);

    if (result.errors) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la denuncia." });
    } else {
      onSuccess();
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denunciar al Usuario: {order.userName}</DialogTitle>
          <DialogDescription>
            Estás creando una denuncia asociada al pedido #{order.id.substring(0, 7)}.
            Explica detalladamente el problema.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de la denuncia</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: No se presentó a retirar el pedido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios adicionales</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalla lo que sucedió..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enviando..." : "Enviar Denuncia"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
