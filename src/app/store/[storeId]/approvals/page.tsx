"use client";

import { useState, use } from "react";
import { useAuth } from "@/context/auth-context";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";
import { ApprovalRequest } from "@/lib/types";
import { where, orderBy } from "firebase/firestore";
import Loader from "@/components/ui/loader";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resolveApprovalRequest } from "./actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X } from "lucide-react";

export default function ApprovalsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { appUser } = useAuth();
    const { data: requests, loading, error } = useFirestoreQuery<ApprovalRequest>(
        'Approvals', 
        [where('storeId', '==', storeId), orderBy('createdAt', 'desc')]
    );
    const { toast } = useToast();
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    const isManager = appUser?.rol === 'store_manager' || appUser?.rol === 'admin';

    const handleResolve = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
        setResolvingId(requestId);
        const resolvedBy = {
            id: appUser?.id || '',
            name: appUser?.name || 'Gerente',
        };
        const result = await resolveApprovalRequest(requestId, status, storeId, resolvedBy);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Éxito', description: result.message });
        }
        setResolvingId(null);
    };

    if (loading) return <Loader className="h-[50vh]" />;
    if (error) return <p className="text-destructive">Error cargando solicitudes: {error.message}</p>;

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Aprobaciones de Gerente" 
                description="Gestión de solicitudes que requieren aprobación (como eliminación de productos)."
            />

            {requests.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        No hay solicitudes de aprobación por el momento.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {requests.map(req => (
                        <Card key={req.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">
                                            {req.type === 'DELETE_PRODUCT' ? 'Eliminar Producto' : 'Solicitud'}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {format(req.createdAt, "d 'de' MMM, yyyy HH:mm", { locale: es })}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={
                                        req.status === 'PENDING' ? 'secondary' : 
                                        req.status === 'APPROVED' ? 'default' : 'destructive'
                                    }>
                                        {req.status === 'PENDING' ? 'Pendiente' : 
                                         req.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 text-sm">
                                <p><span className="font-semibold">Solicitado por:</span> {req.requestedBy.name}</p>
                                {req.type === 'DELETE_PRODUCT' && (
                                    <p><span className="font-semibold">Producto:</span> {req.details.productName}</p>
                                )}
                                {req.resolvedAt && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Resuelto por {req.resolvedBy?.name} el {format(req.resolvedAt, "d 'de' MMM, yyyy HH:mm", { locale: es })}
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="pt-2 flex justify-end gap-2">
                                {req.status === 'PENDING' && isManager && (
                                    <>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-destructive hover:bg-destructive/10"
                                            disabled={resolvingId === req.id}
                                            onClick={() => handleResolve(req.id, 'REJECTED')}
                                        >
                                            <X className="w-4 h-4 mr-1"/> Rechazar
                                        </Button>
                                        <Button 
                                            size="sm"
                                            disabled={resolvingId === req.id}
                                            onClick={() => handleResolve(req.id, 'APPROVED')}
                                        >
                                            <Check className="w-4 h-4 mr-1"/> Aprobar
                                        </Button>
                                    </>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
