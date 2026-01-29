"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useFirestoreSubscription } from '@/hooks/use-firestore-subscription';
import type { Store } from '@/lib/types';
import Loader from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StoreForm } from './store-form';
import { PageHeader } from '../ui/page-header';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteStore } from '@/app/dashboard/stores/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { getImageUrl } from '@/lib/utils';


export default function StoresClient() {
  const { data: stores, loading, error } = useFirestoreSubscription<Store>('Stores');
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const { toast } = useToast();

  const handleEdit = (store: Store) => {
    setSelectedStore(store);
    setDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setSelectedStore(null);
    setDialogOpen(true);
  };

  const handleDelete = (store: Store) => {
    setSelectedStore(store);
    setAlertOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!selectedStore) return;
    const result = await deleteStore(selectedStore.id);
     if (result.message) {
        toast({
            title: "Tienda Eliminada",
            description: result.message,
        });
     }
    setAlertOpen(false);
    setSelectedStore(null);
  };


  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="Tiendas" description="Administra las tiendas.">
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear nueva tienda
        </Button>
      </PageHeader>
      
      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron tiendas.
                    </TableCell>
                </TableRow>
            ) : stores.map((store) => (
              <TableRow key={store.id}>
                <TableCell>
                  <Image
                    src={getImageUrl(store.imageUrl, store.id, 40, 40)}
                    alt={store.name || 'Logo de la tienda'}
                    width={40}
                    height={40}
                    data-ai-hint="store logo"
                    className="rounded-full object-cover"
                  />
                </TableCell>
                <TableCell className="font-medium">{store.name}</TableCell>
                <TableCell>{store.address}, {store.city} {store.zipcode}</TableCell>
                <TableCell>
                  <Badge variant={store.subscriptionPlan === 'PREMIUM' ? 'default' : 'secondary'}>
                    {store.subscriptionPlan}
                  </Badge>
                </TableCell>
                <TableCell>{store.phone}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(store)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleDelete(store)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Borrar</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedStore ? 'Editar Tienda' : 'Crear Nueva Tienda'}</DialogTitle>
          </DialogHeader>
          <StoreForm store={selectedStore} onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Estas seguro de esta acción?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción no se puede deshacer y se eliminara la tienda permanentemente 
                <span className="font-semibold"> "{selectedStore?.name}"</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Borrar
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
