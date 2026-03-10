"use server";

import { adminDb } from '@/lib/firebase-admin';

export async function getSalesAnalysisStats(storeId: string, startMs: number, endMs: number) {
  try {
    const ordersSnapshot = await adminDb.collection('Orders')
      .where('storeId', '==', storeId)
      .where('status', '==', 'DELIVERED')
      .where('createdAt', '>=', startMs)
      .where('createdAt', '<=', endMs)
      .orderBy('createdAt', 'desc')
      .get();

    let totalCost = 0;
    let totalRealValue = 0;
    let totalSalesOfficial = 0;
    let totalItemsSold = 0;
    let analyzedOrdersCount = 0;

    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      
      // Solo incluimos órdenes con datos financieros suficientes
      if (order.tasaOficial && order.tasaParalela) {
        totalSalesOfficial += order.finalTotal || order.totalAmount;
        totalRealValue += ((order.finalTotal || order.totalAmount) * order.tasaOficial) / order.tasaParalela;
        analyzedOrdersCount++;
        
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            totalCost += (item.costPriceUsd || 0) * item.quantity;
            totalItemsSold += item.quantity;
          }
        }
      }
    });

    return {
      success: true,
      data: {
        totalCost,
        totalRealValue,
        netProfit: totalRealValue - totalCost,
        totalSalesOfficial,
        totalItemsSold,
        analyzedOrdersCount,
      }
    };
  } catch (error: any) {
    console.error("Error calculating Sales Analysis:", error);
    return { success: false, error: error.message };
  }
}
