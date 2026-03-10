'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { ApprovalRequest } from '@/lib/types';
import { removeProductFromStore } from '@/app/store/[storeId]/my-products/actions';

export async function createApprovalRequest(
    storeId: string, 
    requestedBy: { id: string, name: string, email: string }, 
    details: any, 
    type: 'DELETE_PRODUCT' = 'DELETE_PRODUCT'
) {
    if (!adminDb) return { error: "Firebase admin DB is null" };
    try {
        const approvalRef = adminDb.collection('Approvals').doc();
        const request: ApprovalRequest = {
            id: approvalRef.id,
            storeId,
            type,
            status: 'PENDING',
            requestedBy,
            details,
            createdAt: Date.now()
        };
        await approvalRef.set(request);
        return { success: true, message: "Solicitud de aprobación enviada al gerente." };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function resolveApprovalRequest(
    requestId: string, 
    status: 'APPROVED' | 'REJECTED', 
    storeId: string, 
    resolvedBy: { id: string, name: string }
) {
    if (!adminDb) return { error: "Firebase admin DB is null" };
    try {
        const approvalRef = adminDb.collection('Approvals').doc(requestId);
        const doc = await approvalRef.get();
        if (!doc.exists) return { error: "Solicitud no encontrada" };
        
        const request = doc.data() as ApprovalRequest;
        if (request.status !== 'PENDING') return { error: "La solicitud ya fue procesada" };
        
        if (status === 'APPROVED' && request.type === 'DELETE_PRODUCT') {
             const result = await removeProductFromStore(storeId, request.details.productId);
             if (result.error) {
                 return { error: `Aprobado, pero falló la eliminación: ${result.error}` };
             }
        }

        await approvalRef.update({
            status,
            resolvedAt: Date.now(),
            resolvedBy
        });
        
        revalidatePath(`/store/${storeId}/approvals`);
        return { success: true, message: `Solicitud ${status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}` };
    } catch(e: any) {
        return { error: e.message };
    }
}
