"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const couponSchema = z.object({
  code: z.string().min(1, "El código es obligatorio").toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.coerce.number().min(0.01, "El valor debe ser positivo"),
  isActive: z.boolean(),
  expirationDate: z.string().min(1, "La fecha de expiración es obligatoria"),
});

export async function createCoupon(storeId: string, formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = couponSchema.safeParse({
    ...values,
    isActive: values.isActive === "true"
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { expirationDate, ...data } = validatedFields.data;

  try {
    // Verificar si ya existe el código para esta tienda
    const q = query(collection(db, "Coupons"), where("storeId", "==", storeId), where("code", "==", data.code));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { errors: { code: ["Este código ya existe para tu tienda."] } };
    }

    await addDoc(collection(db, "Coupons"), {
      ...data,
      storeId,
      expirationDate: new Date(expirationDate).getTime(),
      createdAt: Date.now(),
    });

    revalidatePath(`/store/${storeId}/coupons`);
    return { message: "Cupón creado exitosamente." };
  } catch (e: any) {
    return { errors: { _form: [e.message] } };
  }
}

export async function toggleCouponStatus(storeId: string, couponId: string, isActive: boolean) {
  try {
    const couponRef = doc(db, "Coupons", couponId);
    await updateDoc(couponRef, { isActive });
    revalidatePath(`/store/${storeId}/coupons`);
    return { success: true };
  } catch (e) {
    return { error: "No se pudo actualizar el estado del cupón." };
  }
}

export async function deleteCoupon(storeId: string, couponId: string) {
  try {
    await deleteDoc(doc(db, "Coupons", couponId));
    revalidatePath(`/store/${storeId}/coupons`);
    return { success: true };
  } catch (e) {
    return { error: "No se pudo eliminar el cupón." };
  }
}
