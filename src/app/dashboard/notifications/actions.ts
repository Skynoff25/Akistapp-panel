"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminDb, adminMessaging } from "@/lib/firebase-admin";
import type { AppUser } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

const notificationSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio"),
  targetType: z.enum(['all', 'user', 'store']),
  targetValue: z.string().optional(),
});


async function getTokensForTarget(targetType: string, targetValue?: string): Promise<string[]> {
    let tokens: string[] = [];
    const usersRef = adminDb.collection("Users");

    if (targetType === 'all') {
        const querySnapshot = await usersRef.get();
        querySnapshot.forEach(doc => {
            const user = doc.data() as AppUser;
            if (user.fcmTokens && user.fcmTokens.length > 0) {
                tokens.push(...user.fcmTokens);
            }
        });
    } else if (targetType === 'user' && targetValue) {
        const userDoc = await usersRef.doc(targetValue).get();
        if (userDoc.exists) {
            const user = userDoc.data() as AppUser;
            tokens = user.fcmTokens || [];
        }
    } else if (targetType === 'store' && targetValue) {
        const q = usersRef.where("favoriteStoreIds", "array-contains", targetValue);
        const querySnapshot = await q.get();
        querySnapshot.forEach(doc => {
            const user = doc.data() as AppUser;
            if (user.fcmTokens && user.fcmTokens.length > 0) {
                tokens.push(...user.fcmTokens);
            }
        });
    }
    
    return [...new Set(tokens)];
}

async function cleanupInvalidTokens(tokensToDelete: string[]) {
    if (tokensToDelete.length === 0) return;

    try {
        const usersRef = adminDb.collection("Users");
        const batch = adminDb.batch();

        const tokenChunks: string[][] = [];
        for (let i = 0; i < tokensToDelete.length; i += 30) {
            tokenChunks.push(tokensToDelete.slice(i, i + 30));
        }

        for (const chunk of tokenChunks) {
            const q = usersRef.where("fcmTokens", "array-contains-any", chunk);
            const userSnapshots = await q.get();
            
            userSnapshots.forEach(userDoc => {
                const userTokensToDelete = (userDoc.data() as AppUser).fcmTokens.filter(token => chunk.includes(token));
                if (userTokensToDelete.length > 0) {
                    batch.update(userDoc.ref, {
                        fcmTokens: FieldValue.arrayRemove(...userTokensToDelete)
                    });
                }
            });
        }
        
        await batch.commit();
        console.log(`[REAL] Successfully initiated cleanup for ${tokensToDelete.length} tokens.`);

    } catch(error) {
        console.error("[REAL] Error during token cleanup:", error);
    }
}


export async function sendPushNotification(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = notificationSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, message, targetType, targetValue } = validatedFields.data;

  // 1. Fetch target tokens
  console.log(`[REAL] Fetching tokens for target: ${targetType}`);
  const tokens = await getTokensForTarget(targetType, targetValue);
  
  if (tokens.length === 0) {
      console.log("[REAL] No target tokens found.");
      revalidatePath("/dashboard/notifications");
      return { message: "Envío completado: No se encontraron destinatarios." };
  }
  console.log(`[REAL] Found ${tokens.length} unique tokens to target.`);

  // 2. Send message and get response
  console.log(`[REAL] Sending notification to ${tokens.length} tokens.`);
  const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title, body: message },
  });
  
  // 3. Identify invalid tokens from the response
  const tokensToDelete: string[] = [];
  response.responses.forEach((result, index) => {
    if (!result.success) {
      const error = result.error;
      const invalidTokenCodes = [
        'messaging/registration-token-not-registered', 
        'messaging/invalid-registration-token'
      ];
      if (error && invalidTokenCodes.includes(error.code)) {
        tokensToDelete.push(tokens[index]);
      }
    }
  });

  // 4. Trigger token cleanup logic
  if (tokensToDelete.length > 0) {
    await cleanupInvalidTokens(tokensToDelete);
  }

  console.log("[REAL] Notification process complete.");
  console.log("[REAL] Success count:", response.successCount);
  console.log("[REAL] Failure count:", response.failureCount);
  if (tokensToDelete.length > 0) {
    console.log(`[REAL] Identified ${tokensToDelete.length} tokens for cleanup.`);
  }

  revalidatePath("/dashboard/notifications");
  return { message: `Notificación enviada a ${response.successCount} de ${tokens.length} dispositivos.` };
}
