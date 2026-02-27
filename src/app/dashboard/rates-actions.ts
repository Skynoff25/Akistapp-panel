"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const RATES_DOC_PATH = "Config/rates";

export async function getGlobalRates() {
  try {
    const docRef = doc(db, RATES_DOC_PATH);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as { tasaOficial: number; tasaParalela: number; updatedAt: number };
    }
    return { tasaOficial: 36.5, tasaParalela: 40.0, updatedAt: Date.now() };
  } catch (e) {
    console.error("Error getting rates:", e);
    return { tasaOficial: 36.5, tasaParalela: 40.0, updatedAt: Date.now() };
  }
}

export async function updateGlobalRates(tasaOficial: number, tasaParalela?: number) {
  try {
    const docRef = doc(db, RATES_DOC_PATH);
    const updateData: any = {
      tasaOficial,
      updatedAt: Date.now(),
    };
    if (tasaParalela !== undefined) {
      updateData.tasaParalela = tasaParalela;
    }
    await setDoc(docRef, updateData, { merge: true });
    return { success: true };
  } catch (e) {
    console.error("Error updating global rates:", e);
    return { error: "No se pudieron actualizar las tasas globales." };
  }
}

export async function updateStoreParallelRate(storeId: string, tasaParalela: number) {
  try {
    const storeRef = doc(db, "Stores", storeId);
    await updateDoc(storeRef, {
      tasaParalela,
    });
    revalidatePath(`/store/${storeId}`);
    return { success: true };
  } catch (e) {
    console.error("Error updating store parallel rate:", e);
    return { error: "No se pudo actualizar la tasa paralela de la tienda." };
  }
}

/**
 * Obtiene la tasa oficial desde open.er-api.com y ajusta el paralelo al +10%
 * La tasa oficial se guarda globalmente, el paralelo sugerido se puede usar en la UI
 */
export async function fetchBcvRate(storeId?: string) {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: 'no-store' });
    const data = await res.json();
    
    if (data && data.result === "success" && data.rates && data.rates.VES) {
        const oficial = Number(data.rates.VES);
        // El paralelo sugerido es 10% por encima del oficial
        const paraleloSugerido = oficial * 1.10; 
        
        // Actualizar la oficial globalmente
        await updateGlobalRates(oficial);
        
        // Si se provee storeId, actualizar el paralelo específico de esa tienda
        if (storeId) {
            await updateStoreParallelRate(storeId, paraleloSugerido);
        }
        
        return { oficial, paralelo: paraleloSugerido };
    }
    throw new Error("La API no devolvió un formato válido para VES");
  } catch (e) {
    console.error("Error fetching rates from API:", e);
    return { error: "No se pudo conectar con el servicio de tasas automáticamente." };
  }
}
