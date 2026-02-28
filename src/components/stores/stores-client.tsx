"use client";

import { useState, useMemo } from 'react';
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Copy, Check, Calendar, AlertCircle, XCircle, Zap, ZapOff } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteStore, toggleStoreFeatured } from '@/app/dashboard/stores/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { getImageUrl } from '@/lib/utils';
import { format, differenceInDays, isBefore } from 'date-fns';

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast({ description: "ID de tienda copiado." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function ExpirationBadge({ expiresAt }: { expiresAt?: number }) {
    if (!expiresAt) return <Badge variant="outline">Sin fecha</Badge>;
    
    const now = Date.now();
    const expiryDate = new Date(expiresAt);
    const daysLeft = differenceInDays(expiryDate, now);
    const expired = isBefore(expiryDate, now);

    if (expired) {
        return (
            <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Vencido
            </Badge>
        );
    }

    if (daysLeft <= 7) {
        return (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 gap-1 border-yellow-200">
                <AlertCircle className="h-3 w-3" /> Expira en {daysLeft}d
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
            <Check className="h-3 w-3" /> Activo
        </Badge>
    );
}

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

  const handleToggleFeatured = async (store: Store) => {
    const newState = !store.featured;
    const result = await toggleStoreFeatured(store.id, newState);
    if (result.success) {
        toast({ title: "Estado Actualizado", description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  }

  const handleDelete = (store: Store) => {
    setSelectedStore(store);
    setAlertOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!selectedStore) return;
    const result = await deleteStore(selectedStore.id);
    toast({ title: "Tienda Eliminada", description: result.message });
    setAlertOpen(false);
    setSelectedStore(null);
  };

  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="Tiendas" description="Administra las tiendas y sus planes de pago.">
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear nueva tienda
        </Button>
      </PageHeader>
      
      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Logo</TableHead>
              <TableHead>Nombre / ID</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado Plan</TableHead>
              <TableHead>Último Pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No hay tiendas.</TableCell>
                </TableRow>
            ) : stores.map((store) => (
              <TableRow key={store.id}>
                <TableCell>
                  <div className="relative">
                    <Image src={getImageUrl(store.imageUrl, store.id, 40, 40)} alt={store.name} width={40} height={40} className="rounded-full object-cover" />
                    {store.featured && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                            <Zap className="h-2 w-2 fill-current" />
                        </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {store.name}
                    {store.featured && <Badge variant="default" className="text-[8px] h-4 px-1 bg-primary">DESTACADA</Badge>}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                    {store.id} <CopyIdButton id={store.id} />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={store.subscriptionPlan === 'PREMIUM' ? 'default' : 'secondary'}>{store.subscriptionPlan}</Badge>
                </TableCell>
                <TableCell>
                    <ExpirationBadge expiresAt={store.planExpiresAt} />
                    {store.planExpiresAt && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                            Vence: {format(new Date(store.planExpiresAt), 'dd/MM/yyyy')}
                        </div>
                    )}
                </TableCell>
                <TableCell>
                    <div className="text-sm font-semibold">${store.lastPaymentAmount?.toFixed(2) || '0.00'}</div>
                    {store.lastPaymentDate && (
                        <div className="text-[10px] text-muted-foreground">
                            {format(new Date(store.lastPaymentDate), 'dd/MM/yy')}
                        </div>
                    )}
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleToggleFeatured(store)}>
                                {store.featured ? (
                                    <><ZapOff className="mr-2 h-4 w-4" /> Quitar de Destacadas</>
                                ) : (
                                    <><Zap className="mr-2 h-4 w-4 text-primary" /> Marcar como Destacada</>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEdit(store)}><Edit className="mr-2 h-4 w-4" /> Editar / Cobrar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleDelete(store)}><Trash2 className="mr-2 h-4 w-4" /> Borrar</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>{selectedStore ? 'Gestionar Tienda' : 'Crear Nueva Tienda'}</DialogTitle></DialogHeader>
          <StoreForm store={selectedStore} onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Borrar tienda?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente "{selectedStore?.name}".</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Borrar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
