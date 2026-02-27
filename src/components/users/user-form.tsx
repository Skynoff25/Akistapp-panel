'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createUser, updateUser } from '@/app/dashboard/users/actions';
import { useToast } from '@/hooks/use-toast';
import { AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
  rol: z.enum(['admin', 'store_manager', 'store_employee', 'customer']),
  storeId: z.string().optional(),
}).refine((data) => {
    if ((data.rol === 'store_manager' || data.rol === 'store_employee') && !data.storeId) {
        return false;
    }
    return true;
}, {
    message: "Se requiere seleccionar una tienda para este rol",
    path: ["storeId"],
});

interface UserFormProps {
  initialData?: AppUser;
  onSuccess?: () => void;
}

export function UserForm({ initialData, onSuccess }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || initialData?.displayName || '',
      email: initialData?.email || '',
      password: '',
      rol: initialData?.rol || 'store_employee',
      storeId: initialData?.storeId || '',
    },
  });

  const role = form.watch('rol');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('rol', values.rol);
    if (values.storeId) formData.append('storeId', values.storeId);
    
    if (values.password) {
        formData.append('password', values.password);
    } else if (!initialData) {
        form.setError('password', { message: 'La contraseña es obligatoria para nuevos usuarios' });
        setIsLoading(false);
        return;
    }

    try {
      let result;
      if (initialData) {
        formData.append('id', initialData.id);
        result = await updateUser(formData);
      } else {
        result = await createUser(formData);
      }

      if (result?.errors) {
        const errorMessages = Object.values(result.errors).flat().join(', ');
        toast({ variant: 'destructive', title: 'Error', description: errorMessages });
      } else if (result?.message) {
        toast({ title: 'Éxito', description: result.message });
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Algo salió mal.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="juan@ejemplo.com" {...field} disabled={!!initialData} /> 
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña {initialData && '(Dejar en blanco para mantener la actual)'}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="store_manager">Gerente de Tienda</SelectItem>
                  <SelectItem value="store_employee">Empleado</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {(role === 'store_manager' || role === 'store_employee') && (
          <FormField
            control={form.control}
            name="storeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID de Tienda</FormLabel>
                <FormControl>
                  <Input placeholder="Copia el ID desde el panel de Tiendas" {...field} />
                </FormControl>
                <FormDescription>
                  Puedes copiar este ID directamente desde la lista de tiendas.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Actualizar Usuario' : 'Crear Usuario'}
        </Button>
      </form>
    </Form>
  );
}
