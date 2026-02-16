"use client";

import { useState } from 'react';
import { useFirestoreSubscription } from '@/hooks/use-firestore-subscription';
import type { AppUser } from '@/lib/types';
import Loader from '@/components/ui/loader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '../ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserForm } from './user-form';
import { getImageUrl } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUser } from '@/app/dashboard/users/actions';
import { useToast } from '@/hooks/use-toast';

const getInitials = (name?: string | null) => {
    if (!name || name.trim() === '') return '??';
    const names = name.trim().split(' ').filter(n => n);
    if (names.length > 1 && names[names.length-1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names.length === 1 && names[0]) {
        return names[0].substring(0, 2).toUpperCase();
    }
    return '??';
}

export default function UsersClient() {
  const { data: users, loading, error } = useFirestoreSubscription<AppUser>('Users');
  
  // Estado para Crear
  const [isDialogOpen, setDialogOpen] = useState(false);
  
  // Estados para Editar y Borrar
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Lógica de eliminación conectada a tu Server Action
  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const result = await deleteUser(deletingId);
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Usuario eliminado', description: 'El usuario ha sido eliminado correctamente.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error inesperado.' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="Usuarios" description="Ver todos los usuarios registrados.">
         <Button onClick={() => setDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Nuevo Usuario
        </Button>
      </PageHeader>

      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {users.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron usuarios.
                    </TableCell>
                </TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                    <Avatar>
                        <AvatarImage src={getImageUrl(user.photoUrl, user.id, 40, 40)} alt={user.name || user.email || 'Avatar'} />
                        <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
                    </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.name || user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.cityName || '-'}</TableCell>
                <TableCell>
                  <Badge variant={user.rol === 'admin' ? 'default' : 'secondary'}>
                    {user.rol}
                  </Badge>
                </TableCell>
                
                {/* Columna de Acciones */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setTimeout(() => setEditingUser(user), 100)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setTimeout(() => setDeletingId(user.id), 100)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de Creación */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <UserForm onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edición */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <UserForm 
              initialData={editingUser} 
              onSuccess={() => setEditingUser(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Alerta de Borrado */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario 
              <strong> {users.find(u => u.id === deletingId)?.name} </strong>
              y sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}