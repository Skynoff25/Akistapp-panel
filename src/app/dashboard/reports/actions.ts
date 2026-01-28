"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import type { ReportStatus } from "@/lib/types";

const reportSchema = z.object({
  reportedBy: z.string(),
  reportedUserId: z.string(),
  reportedUserName: z.string(),
  reportedUserEmail: z.string(),
  reason: z.string().min(1, "El motivo es obligatorio"),
  comments: z.string().min(10, "Los comentarios deben tener al menos 10 caracteres"),
  orderId: z.string().optional(),
});

const updateStatusSchema = z.object({
    status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "DISMISSED"]),
});

export async function createReport(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = reportSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { reportedUserId, reportedUserName, reportedUserEmail, ...reportData } = validatedFields.data;

  try {
    await addDoc(collection(db, "Reports"), {
      ...reportData,
      reportedUser: {
        id: reportedUserId,
        name: reportedUserName,
        email: reportedUserEmail,
      },
      status: "PENDING",
      createdAt: Date.now(),
    });

    revalidatePath("/dashboard/reports");
    return { message: "Denuncia creada exitosamente." };
  } catch (e: any) {
    return { errors: { _form: ["No se pudo crear la denuncia. " + e.message] } };
  }
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
    const validatedFields = updateStatusSchema.safeParse({ status });

    if (!validatedFields.success) {
        return { error: "Estado inválido." };
    }

    try {
        const reportRef = doc(db, "Reports", reportId);
        await updateDoc(reportRef, {
            status: validatedFields.data.status,
        });

        revalidatePath("/dashboard/reports");
        return { message: "El estado de la denuncia ha sido actualizado." };
    } catch (e: any) {
        return { error: "No se pudo actualizar la denuncia. " + e.message };
    }
}
