"use client";

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useFirestoreQuery } from '@/hooks/use-firestore-query';
import type { StoreProduct, Product } from '@/lib/types';
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
  DialogDescription
} from '@/components/ui/dialog';
import { PageHeader } from '../ui/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { addProductToStore, removeProductFromStore } from '@/app/store/[storeId]/my-products/actions';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { StoreProductForm } from './store-product-form';
import { useAuth } from '@/context/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { where } from 'firebase/firestore';
import { getImageUrl } from '@/lib/utils';

interface StoreProductsClientProps {
  storeId: string;
}

function AddProductDialog({
  storeId,
  open,
  onOpenChange,
  onSuccess,
  existingProductIds,
}: {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingProductIds: string[];
}) {
  const { data: globalProducts, loading } = useFirestoreQuery<Product>('Products');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setSubmitting] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredProducts = useMemo(() => {
    if (!globalProducts) return [];
    return globalProducts.filter(
      p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !existingProductIds.includes(p.id)
    );
  }, [globalProducts, searchTerm, existingProductIds]);

  const handleAddProduct = async (productId: string) => {
    setSubmitting(productId);
    const formData = new FormData();
    formData.append('storeId', storeId);
    formData.append('productId', productId);
    const result = await addProductToStore(formData);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Éxito', description: result.success });
      onSuccess();
    }
    setSubmitting(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Añadir Producto del Catálogo Global</DialogTitle>
          <DialogDescription>
            Busca y añade productos a tu inventario. El precio y la disponibilidad se pueden editar después.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
            />
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
            {loading ? <Loader /> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No se encontraron productos o ya están en tu tienda.
                                </TableCell>
                            </TableRow>
                        ) : filteredProducts.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                     <Image src={getImageUrl(p.image, p.id, 40, 40)} alt={p.name || 'Imagen del producto'} width={40} height={40} className="rounded-md object-cover"/>
                                     {p.name}
                                </TableCell>
                                <TableCell>{p.category}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleAddProduct(p.id)} disabled={isSubmitting === p.id}>
                                        {isSubmitting === p.id ? 'Añadiendo...' : 'Añadir a mi tienda'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StoreProductsClient({ storeId }: StoreProductsClientProps) {
  const { appUser } = useAuth();
  const { data: storeProducts, loading, error } = useFirestoreQuery<StoreProduct>('Inventory', [where('storeId', '==', storeId)]);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditFormOpen, setEditFormOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const { toast } = useToast();
  
  const existingProductIds = useMemo(() => storeProducts.map(p => p.productId), [storeProducts]);

  const handleEdit = (product: StoreProduct) => {
    setSelectedProduct(product);
    setEditFormOpen(true);
  }

  const handleDelete = (product: StoreProduct) => {
    setSelectedProduct(product);
    setAlertOpen(true);
  }

  const confirmDelete = async () => {
    if (selectedProduct) {
        const result = await removeProductFromStore(storeId, selectedProduct.id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Éxito', description: result.message });
        }
        setAlertOpen(false);
    }
  };


  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  const canManageProducts = appUser?.rol === 'store_manager' || appUser?.rol === 'admin';

  return (
    <>
      <PageHeader title="Mis Productos" description="Gestiona el inventario, precios y disponibilidad de productos en tu tienda.">
        {canManageProducts && (
            <Button onClick={() => setAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Producto
            </Button>
        )}
      </PageHeader>
      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Disponibilidad</TableHead>
              <TableHead className="text-right w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storeProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No tienes productos en tu tienda todavía.
                </TableCell>
              </TableRow>
            ) : storeProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image
                    src={getImageUrl(product.storeSpecificImage || product.globalImage, product.productId)}
                    alt={product.name || 'Imagen del producto'}
                    width={64}
                    height={64}
                    data-ai-hint="product photo"
                    className="rounded-md object-cover"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                    {product.hasVariations ? (
                        <span className="font-semibold text-sm">{product.priceRange || 'N/A'}</span>
                    ) : product.promotionalPrice && product.promotionalPrice > 0 ? (
                        <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-destructive">${product.promotionalPrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground line-through">${product.price.toFixed(2)}</span>
                        </div>
                    ) : (
                        `$${product.price.toFixed(2)}`
                    )}
                </TableCell>
                <TableCell>
                    <Badge variant={product.currentStock > 0 ? 'outline' : 'destructive'}>
                        {product.currentStock} en stock
                    </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={product.isAvailable ? 'default' : 'secondary'}>
                    {product.isAvailable ? 'Disponible' : 'No Disponible'}
                  </Badge>
                </TableCell>
                 <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Gestionar</span>
                            </DropdownMenuItem>
                            {canManageProducts && (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleDelete(product)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Eliminar</span>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

        <AddProductDialog 
            storeId={storeId}
            open={isAddDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSuccess={() => setAddDialogOpen(false)}
            existingProductIds={existingProductIds}
        />

        <Dialog open={isEditFormOpen} onOpenChange={setEditFormOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Gestionar Producto de Tienda</DialogTitle>
                    <DialogDescription>{selectedProduct?.name}</DialogDescription>
                </DialogHeader>
                {selectedProduct && <StoreProductForm storeId={storeId} product={selectedProduct} onSuccess={() => setEditFormOpen(false)} />}
            </DialogContent>
        </Dialog>

        <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estas seguro de esta acción?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción eliminará el producto <span className="font-semibold">"{selectedProduct?.name}"</span> de tu tienda. No se eliminará del catálogo global.
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
  );
}
