"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
// import { adminMessaging, adminDb } from "@/lib/firebase-admin";
// import { FieldValue } from "firebase-admin/firestore";

const notificationSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio"),
  targetType: z.enum(['all', 'user', 'store']),
  targetValue: z.string().optional(),
});

/**
 * NOTE: This action is a functional SIMULATION.
 * The Firebase Admin SDK, required for sending push notifications from the server,
 * cannot be authenticated in the current environment. This action simulates the
p * complete flow, including fetching tokens and handling invalid ones, but does
 * not perform real database writes or send actual notifications.
 * See /docs/backend.md for more details.
 */
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
    // --- Step 1: Fetch Tokens (Simulated Read) ---
    // In a real app, this would query Firestore using the Admin SDK.
    const tokens = await getTargetTokens(targetType, targetValue);

    if (tokens.length === 0) {
      return { message: "No se encontraron dispositivos para notificar." };
    }

    console.log(`[SIMULATION] Found ${tokens.length} tokens to send to.`);
    
    // --- Step 2: Send Message (Simulated) ---
    // This is where you'd use the Admin SDK to send the message.
    /*
    if (!adminMessaging) {
      throw new Error("El SDK de mensajería de Firebase no está inicializado.");
    }
    const response = await adminMessaging.sendEachForMulticast({
      tokens: tokens.map(t => t.token),
      notification: { title, message },
      // You can add more data here
    });
    */
    
    // We will simulate a response where some tokens have failed.
    const simulatedSuccessCount = Math.max(0, tokens.length - 2);
    const simulatedFailureCount = tokens.length - simulatedSuccessCount;
    console.log(`[SIMULATION] ${simulatedSuccessCount} messages sent successfully, ${simulatedFailureCount} failed.`);

    // --- Step 3: Cleanup Invalid Tokens (Simulated) ---
    // The response from `sendEachForMulticast` tells you which tokens are invalid.
    const invalidTokens: string[] = [];
    if (simulatedFailureCount > 0) {
        // Get the last N tokens to simulate them being invalid
        invalidTokens.push(...tokens.slice(-simulatedFailureCount).map(t => t.token));
        console.log('[SIMULATION] Identified invalid tokens:', invalidTokens);
    }
    
    if (invalidTokens.length > 0) {
      await cleanupInvalidTokens(invalidTokens);
    }

    revalidatePath("/dashboard/notifications");
    return { message: `Notificación enviada a ${simulatedSuccessCount} de ${tokens.length} dispositivos (Simulación).` };

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return { errors: { _form: [error.message] } };
  }
}

async function getTargetTokens(targetType: string, targetValue?: string): Promise<{ userId: string, token: string }[]> {
  // This is a simplified, read-only simulation. A real implementation would use the Admin SDK.
  const { db } = await import("@/lib/firebase");
  const { collection, query, where, getDocs } = await import("firebase/firestore");
  
  let userDocsQuery;
  
  if (targetType === 'all') {
    userDocsQuery = query(collection(db, "Users"), where('fcmTokens', '!=', []));
  } else if (targetType === 'user' && targetValue) {
    userDocsQuery = query(collection(db, "Users"), where('__name__', '==', targetValue));
  } else if (targetType === 'store' && targetValue) {
    // This logic is for sending to users who have favorited a store.
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
    console.log('[SIMULATION] Starting token cleanup process.');
    // In a real backend, you would batch write updates to remove the invalid tokens.
    /*
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
    */
    console.log(`[SIMULATION] Cleanup complete. Would have removed ${invalidTokens.length} tokens from user documents.`);
}
