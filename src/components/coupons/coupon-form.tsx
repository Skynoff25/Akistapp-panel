"use client";

import { useForm } from "react-hook-form";
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
import { createCoupon } from "@/app/store/[storeId]/coupons/actions";

const couponSchema = z.object({
  code: z.string().min(1, "El código es obligatorio").toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.coerce.number().min(0.01, "El valor debe ser positivo"),
  isActive: z.boolean(),
  expirationDate: z.string().min(1, "La fecha es obligatoria"),
});

type CouponFormValues = z.infer<typeof couponSchema>;

export function CouponForm({ storeId, onSuccess }: { storeId: string, onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discountType: "PERCENTAGE",
      discountValue: 10,
      isActive: true,
      expirationDate: "",
    },
  });

  const onSubmit = async (data: CouponFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, String(value)));
    
    const result = await createCoupon(storeId, formData);
    if (result.errors) {
        Object.entries(result.errors).forEach(([key, value]) => {
            form.setError(key as any, { message: (value as string[]).join(", ") });
        });
    } else {
        toast({ title: "Cupón Creado", description: result.message });
        onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del Cupón</FormLabel>
              <FormControl><Input placeholder="VERANO20" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tipo de Descuento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                        <SelectItem value="FIXED">Monto Fijo ($)</SelectItem>
                    </SelectContent>
                </Select>
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="expirationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Expiración</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel>Cupón Activo</FormLabel>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creando..." : "Crear Cupón"}
        </Button>
      </form>
    </Form>
  );
}
