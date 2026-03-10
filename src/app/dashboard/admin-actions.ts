"use server";

import { adminDb } from '@/lib/firebase-admin';

export async function getAdminKpisStats(startOfTodayMs: number) {
    try {
        const today = new Date(startOfTodayMs);

        // 1. GMV Today (Summing totalAmount of today's orders)
        // Note: Firestore admin aggregate queries don't directly sum natively yet in all SDKs easily without Cloud Functions or the newest Node SDK support.
        // Wait, admin SDK has `aggregate()` with `sum()`, let's use standard fetching for today's orders since it's just one day, or use aggregate if available.
        // Let's use get() since we need both total and completion rate, and it's just 1 day of orders.
        // But for Stores and Users, we definitely just count.
        
        // --- 1. Today's Orders & GMV ---
        const ordersSnapshot = await adminDb.collection('Orders')
            .where('createdAt', '>=', startOfTodayMs)
            .get();
        
        let gmvToday = 0;
        let completed = 0;
        let cancelled = 0;
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            gmvToday += (order.totalAmount || 0);
            if (order.status === 'DELIVERED') completed++;
            if (order.status === 'CANCELLED') cancelled++;
        });

        const totalFinished = completed + cancelled;
        const completionRate = totalFinished > 0 ? (completed / totalFinished) * 100 : 100;
        const ordersCount = ordersSnapshot.size;

        // --- 2. Active Users Today ---
        // Using count() to avoid fetching all user documents
        const activeUsersQuery = adminDb.collection('Users').where('lastLoginAt', '>=', startOfTodayMs);
        const activeUsersCountSnap = await activeUsersQuery.count().get();
        const activeUsersCount = activeUsersCountSnap.data().count;

        // --- 3. Estimated Daily Income (Stores) ---
        // We still need the store plans. We could fetch just the `subscriptionPlan` field to save bandwidth, but read cost remains 1 per doc.
        // However, fetching a few hundred stores is fine.
        const storesSnapshot = await adminDb.collection('Stores').select('subscriptionPlan').get();
        const planPrices: Record<string, number> = { BASIC: 5, STANDARD: 15, PREMIUM: 50 };
        let monthlyIncome = 0;
        
        storesSnapshot.forEach(doc => {
            const plan = doc.data().subscriptionPlan;
            if (plan && planPrices[plan]) {
                monthlyIncome += planPrices[plan];
            }
        });
        const dailyIncomeEstimated = monthlyIncome / 30;

        return {
            success: true,
            data: {
                gmvToday,
                dailyIncomeEstimated,
                completionRate,
                activeUsersCount,
                ordersCount
            }
        };

    } catch (error: any) {
        console.error("Error getting Admin KPIs:", error);
        return { success: false, error: error.message };
    }
}
