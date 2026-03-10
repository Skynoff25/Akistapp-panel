'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { ApprovalRequest, AppUser } from '@/lib/types';
import { removeProductFromStore } from '@/app/store/[storeId]/my-products/actions';

async function verifyActionAuth(storeId: string, allowedRoles: string[]) {
    if (!adminAuth || !adminDb) return { error: "Firebase admin no instanciado." };
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return { error: "Sesión no iniciada o inválida." };
    
    let decoded;
    try {
        decoded = await adminAuth.verifyIdToken(token);
    } catch(e) {
        return { error: "Sesión expirada o token inválido." };
    }
    
    const userDoc = await adminDb.collection('Users').doc(decoded.uid).get();
    if (!userDoc.exists) return { error: "Usuario no encontrado en la base de datos." };
    
    const userData = userDoc.data() as AppUser;
    if (!allowedRoles.includes(userData.rol)) return { error: "No tienes permisos para realizar esta acción." };
    
    if (userData.rol !== 'admin' && userData.storeId !== storeId) {
        return { error: "No tienes acceso a los recursos de esta tienda." };
    }
    
    return { user: userData };
}

export async function createApprovalRequest(
    storeId: string, 
    requestedBy: { id: string, name: string, email: string }, 
    details: { productId: string, productName: string }, 
    type: 'DELETE_PRODUCT' = 'DELETE_PRODUCT'
) {
    const authCheck = await verifyActionAuth(storeId, ['store_employee', 'store_manager', 'admin']);
    if (authCheck.error) return { error: authCheck.error };
    
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
    const authCheck = await verifyActionAuth(storeId, ['store_manager', 'admin']);
    if (authCheck.error) return { error: authCheck.error };

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
