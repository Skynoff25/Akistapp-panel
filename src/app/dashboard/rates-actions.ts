"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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

export async function updateGlobalRates(tasaOficial: number, tasaParalela: number) {
  try {
    const docRef = doc(db, RATES_DOC_PATH);
    await setDoc(docRef, {
      tasaOficial,
      tasaParalela,
      updatedAt: Date.now(),
    }, { merge: true });
    revalidatePath("/store");
    return { success: true };
  } catch (e) {
    console.error("Error updating rates:", e);
    return { error: "No se pudieron actualizar las tasas." };
  }
}

/**
 * Obtiene la tasa oficial desde open.er-api.com y ajusta el paralelo al +10%
 */
export async function fetchBcvRate() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: 'no-store' });
    const data = await res.json();
    
    if (data && data.result === "success" && data.rates && data.rates.VES) {
        const oficial = Number(data.rates.VES);
        // El paralelo por defecto es 10% por encima del oficial según requerimiento
        const paralelo = oficial * 1.10; 
        
        await updateGlobalRates(oficial, paralelo);
        
        return { oficial, paralelo };
    }
    throw new Error("La API no devolvió un formato válido para VES");
  } catch (e) {
    console.error("Error fetching rates from API:", e);
    return { error: "No se pudo conectar con el servicio de tasas automáticamente." };
  }
}
