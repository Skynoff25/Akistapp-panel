"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminMessaging, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const notificationSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio"),
  targetType: z.enum(['all', 'user', 'store']),
  targetValue: z.string().optional(),
});

export async function sendPushNotification(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = notificationSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, message, targetType, targetValue } = validatedFields.data;

  try {
    const tokens = await getTargetTokens(targetType, targetValue);

    if (tokens.length === 0) {
      return { message: "No se encontraron dispositivos para notificar." };
    }
    
    if (!adminMessaging) {
      throw new Error("El SDK de mensajería de Firebase no está inicializado.");
    }

    const response = await adminMessaging.sendEachForMulticast({
      tokens: tokens.map(t => t.token),
      notification: { title, message },
    });
    
    const invalidTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        console.error(`Failed to send to token ${tokens[idx].token}:`, res.error);
        if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(res.error.code)) {
            invalidTokens.push(tokens[idx].token);
        }
      }
    });
    
    if (invalidTokens.length > 0) {
      await cleanupInvalidTokens(invalidTokens);
    }

    revalidatePath("/dashboard/notifications");
    return { message: `Notificación enviada a ${response.successCount} de ${tokens.length} dispositivos.` };

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return { errors: { _form: [error.message] } };
  }
}

async function getTargetTokens(targetType: string, targetValue?: string): Promise<{ userId: string, token: string }[]> {
  const { db } = await import("@/lib/firebase");
  const { collection, query, where, getDocs } = await import("firebase/firestore");
  
  let userDocsQuery;
  
  if (targetType === 'all') {
    userDocsQuery = query(collection(db, "Users"), where('fcmTokens', '!=', []));
  } else if (targetType === 'user' && targetValue) {
    userDocsQuery = query(collection(db, "Users"), where('__name__', '==', targetValue));
  } else if (targetType === 'store' && targetValue) {
    userDocsQuery = query(collection(db, "Users"), where('favoriteStoreIds', 'array-contains', targetValue));
  } else {
    return [];
  }
  
  const querySnapshot = await getDocs(userDocsQuery);
  const tokens: { userId: string, token: string }[] = [];
  querySnapshot.forEach(doc => {
    const user = doc.data();
    if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
      user.fcmTokens.forEach(token => {
        tokens.push({ userId: doc.id, token });
      });
    }
  });
  return tokens;
}

async function cleanupInvalidTokens(invalidTokens: string[]) {
    if (!adminDb) {
      throw new Error("El SDK de Firestore de Administrador no está inicializado.");
    }
    const tokensCollection = adminDb.collection('Users');
    const snapshot = await tokensCollection.where('fcmTokens', 'array-contains-any', invalidTokens).get();

    const batch = adminDb.batch();
    snapshot.forEach(doc => {
        const userRef = tokensCollection.doc(doc.id);
        batch.update(userRef, {
            fcmTokens: FieldValue.arrayRemove(...invalidTokens)
        });
    });

    await batch.commit();
    console.log(`Cleanup complete. Removed ${invalidTokens.length} invalid tokens.`);
}
