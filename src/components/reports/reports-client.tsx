"use client";

import { useState } from "react";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import type { Report, ReportStatus } from "@/lib/types";
import Loader from "@/components/ui/loader";
import { PageHeader } from "../ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateReportStatus } from "@/app/dashboard/reports/actions";

const statusTranslations: Record<ReportStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  RESOLVED: "Resuelta",
  DISMISSED: "Desestimada",
};

const statusColors: Record<ReportStatus, string> = {
  PENDING: "bg-yellow-500",
  IN_PROGRESS: "bg-blue-500",
  RESOLVED: "bg-green-500",
  DISMISSED: "bg-gray-500",
};

function StatusSelector({ reportId, currentStatus, onUpdate }: { reportId: string, currentStatus: ReportStatus, onUpdate: () => void }) {
    const [status, setStatus] = useState<ReportStatus>(currentStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleUpdate = async () => {
        setIsSubmitting(true);
        const result = await updateReportStatus(reportId, status);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Éxito', description: result.message });
            onUpdate();
        }
        setIsSubmitting(false);
    };

    return (
         <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Cambiar estado" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(statusTranslations).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button onClick={handleUpdate} disabled={isSubmitting || status === currentStatus}>
                {isSubmitting ? '...' : 'Actualizar'}
            </Button>
        </div>
    );
}

export default function ReportsClient() {
  const { data: reports, loading, error, refetch } = useFirestoreQuery<Report>("Reports");

  if (loading) return <Loader className="h-[50vh]" text="Cargando denuncias..." />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <>
      <PageHeader
        title="Gestión de Denuncias"
        description="Revisa y gestiona las denuncias de usuarios y tiendas."
      />

      <div className="bg-card rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Denunciado</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Comentarios</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Gestionar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron denuncias.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    {format(new Date(report.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {report.reportedUser?.name || report.reportedStore?.name || 'N/A'}
                    <span className="block text-xs text-muted-foreground">
                        {report.reportedUser ? 'Usuario' : 'Tienda'}
                    </span>
                  </TableCell>
                  <TableCell>{report.reason}</TableCell>
                  <TableCell className="max-w-xs truncate">{report.comments}</TableCell>
                  <TableCell>
                    {report.orderId && (
                        <span className="text-xs">Pedido: #{report.orderId.substring(0, 7)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusColors[report.status]}`}></span>
                        {statusTranslations[report.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusSelector reportId={report.id} currentStatus={report.status} onUpdate={refetch} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
