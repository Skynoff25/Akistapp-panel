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
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserForm } from './user-form';
import { getImageUrl } from '@/lib/utils';


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
  const [isDialogOpen, setDialogOpen] = useState(false);

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
            </TableRow>
          </TableHeader>
          <TableBody>
          {users.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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
                <TableCell>{user.cityName}</TableCell>
                <TableCell>
                  <Badge variant={user.rol === 'admin' ? 'default' : 'secondary'}>
                    {user.rol}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <UserForm onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
