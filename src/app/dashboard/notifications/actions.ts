
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
        const code = (res.error as any).code;
        if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(code)) {
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
  if (!adminDb) {
    throw new Error("El SDK de Firestore de Administrador no está inicializado.");
  }
  
  let userQuery: any = adminDb.collection("Users");
  
  if (targetType === 'all') {
    // Nota: El operador '!=' requiere un índice si se combina con otros filtros, 
    // pero aquí es simple sobre fcmTokens.
    userQuery = userQuery.where('fcmTokens', '!=', []);
  } else if (targetType === 'user' && targetValue) {
    userQuery = userQuery.where('__name__', '==', targetValue);
  } else if (targetType === 'store' && targetValue) {
    userQuery = userQuery.where('favoriteStoreIds', 'array-contains', targetValue);
  } else {
    return [];
  }
  
  const querySnapshot = await userQuery.get();
  const tokens: { userId: string, token: string }[] = [];
  
  querySnapshot.forEach((doc: any) => {
    const user = doc.data();
    if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
      user.fcmTokens.forEach((token: string) => {
        tokens.push({ userId: doc.id, token });
      });
    }
  });
  
  return tokens;
}

async function cleanupInvalidTokens(invalidTokens: string[]) {
    if (!adminDb) return;
    
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
