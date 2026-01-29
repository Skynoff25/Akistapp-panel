"use client";

import { useState } from "react";
import Image from "next/image";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import type { Promotion } from "@/lib/types";
import Loader from "@/components/ui/loader";
import { PageHeader } from "../ui/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { PromotionForm } from "./promotion-form";
import { deletePromotion } from "@/app/dashboard/promotions/actions";

export default function PromotionsClient() {
  const { data: promotions, loading, error, refetch } = useFirestoreQuery<Promotion>("Promotions");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const { toast } = useToast();

  const handleEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPromotion(null);
    setDialogOpen(true);
  };

  const handleDelete = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedPromotion) {
      const result = await deletePromotion(selectedPromotion.id);
       if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      } else {
        toast({
          title: "Promoción Eliminada",
          description: `La promoción "${selectedPromotion.title}" ha sido eliminada.`,
        });
      }
      setAlertOpen(false);
      setSelectedPromotion(null);
    }
  };

  if (loading) return <Loader className="h-[50vh]" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader
        title="Promociones"
        description="Crea y administra banners publicitarios y promociones para las tiendas."
      >
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Nueva Promoción
        </Button>
      </PageHeader>

      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Imagen</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead>Ciudad (Zip)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron promociones.
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell>
                    <Image
                      src={promo.imageUrl || `https://picsum.photos/seed/${promo.id}/80/40`}
                      alt={promo.title}
                      width={80}
                      height={40}
                      className="rounded-md object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{promo.title}</TableCell>
                  <TableCell>{promo.storeName}</TableCell>
                  <TableCell>{promo.cityId}</TableCell>
                  <TableCell>
                    <Badge variant={promo.isActive ? "default" : "outline"}>
                      {promo.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(promo)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(promo)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPromotion ? "Editar Promoción" : "Crear Nueva Promoción"}
            </DialogTitle>
          </DialogHeader>
          <PromotionForm
            promotion={selectedPromotion}
            onSuccess={() => {
              setDialogOpen(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de esta acción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer y eliminará la promoción permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
