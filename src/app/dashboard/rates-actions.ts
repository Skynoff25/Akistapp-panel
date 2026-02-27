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
 * Intenta obtener la tasa oficial desde una API externa (DolarAPI es común en Venezuela)
 */
export async function fetchBcvRate() {
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", { cache: 'no-store' });
    const data = await res.json();
    
    if (data && data.promedio) {
        const oficial = Number(data.promedio);
        const paralelo = oficial * 1.10; // 10% por encima por defecto
        
        await updateGlobalRates(oficial, paralelo);
        
        return { oficial, paralelo };
    }
    throw new Error("Formato de API desconocido");
  } catch (e) {
    console.error("Error fetching BCV from API:", e);
    return { error: "No se pudo conectar con el BCV automáticamente." };
  }
}
