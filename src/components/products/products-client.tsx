"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import type { Product } from '@/lib/types';
import Loader from '@/components/ui/loader';
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
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from '../ui/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { ProductForm } from './product-form';
import { useToast } from '@/hooks/use-toast';
import { deleteProduct } from '@/app/dashboard/products/actions';
import { getImageUrl } from '@/lib/utils';

interface ProductsClientProps {
  isAdmin: boolean;
}

export default function ProductsClient({ isAdmin }: ProductsClientProps) {
  const { data: products, loading, error, refetch } = useFirestoreQuery<Product>('Products');
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  
  const handleAddNew = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    const result = await deleteProduct(selectedProduct.id);
     if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
     } else {
        toast({ title: "Producto Eliminado", description: result.message });
     }
    setAlertOpen(false);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    refetch();
  };

  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="Catálogo de Productos" description="Busca y gestiona el catálogo global de productos.">
         {isAdmin && (
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Nuevo Producto
            </Button>
         )}
      </PageHeader>
      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
               {isAdmin && <TableHead className="text-right w-[80px]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                        No se encontraron productos.
                    </TableCell>
                </TableRow>
            ) : products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image
                    src={getImageUrl(product.image, product.id)}
                    alt={product.name || 'Imagen del producto'}
                    width={64}
                    height={64}
                    data-ai-hint="product photo"
                    className="rounded-md object-cover"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{product.description}</TableCell>
                {isAdmin && (
                    <TableCell className="text-right">
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(product)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(product)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Eliminar</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <>
            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{selectedProduct ? "Editar Producto" : "Crear Nuevo Producto Global"}</DialogTitle>
                </DialogHeader>
                <ProductForm product={selectedProduct} onSuccess={handleFormSuccess} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de esta acción?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción eliminará el producto <span className="font-semibold">"{selectedProduct?.name}"</span> permanentemente.
                        Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
      )}
    </>
  );
}
