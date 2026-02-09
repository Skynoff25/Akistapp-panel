"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, getDoc, doc, writeBatch, arrayRemove } from "firebase/firestore";
import type { AppUser } from "@/lib/types";

const notificationSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio"),
  targetType: z.enum(['all', 'user', 'store']),
  targetValue: z.string().optional(),
});


/**
 * Fetches FCM tokens based on the target audience.
 * NOTE: In a production environment, fetching ALL tokens can be memory-intensive.
 * This should be handled in batches or by a dedicated backend process.
 */
async function getTokensForTarget(targetType: string, targetValue?: string): Promise<string[]> {
    let tokens: string[] = [];
    const usersRef = collection(db, "Users");

    if (targetType === 'all') {
        const querySnapshot = await getDocs(usersRef);
        querySnapshot.forEach(doc => {
            const user = doc.data() as AppUser;
            if (user.fcmTokens && user.fcmTokens.length > 0) {
                tokens.push(...user.fcmTokens);
            }
        });
    } else if (targetType === 'user' && targetValue) {
        const userDoc = await getDoc(doc(db, 'Users', targetValue));
        if (userDoc.exists()) {
            const user = userDoc.data() as AppUser;
            tokens = user.fcmTokens || [];
        }
    } else if (targetType === 'store' && targetValue) {
        // This assumes we send to users who have favorited the store.
        // The logic can be adapted based on requirements.
        const q = query(usersRef, where("favoriteStoreIds", "array-contains", targetValue));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            const user = doc.data() as AppUser;
            if (user.fcmTokens && user.fcmTokens.length > 0) {
                tokens.push(...user.fcmTokens);
            }
        });
    }
    
    // Return unique tokens
    return [...new Set(tokens)];
}

/**
 * Removes invalid FCM tokens from the database.
 * NOTE: This implementation is for demonstration. It is highly inefficient as it
 * queries the entire user base. A production system should have a reverse-map
 * (token -> userId) to perform this cleanup efficiently.
 */
async function cleanupInvalidTokens(tokensToDelete: string[]) {
    if (tokensToDelete.length === 0) return;
    
    console.log(`[SIMULATION] Starting cleanup for ${tokensToDelete.length} invalid tokens.`);

    // --- THIS IS THE REAL LOGIC, BUT IT'S INEFFICIENT AND SHOULD RUN ON A DEDICATED BACKEND ---
    /*
    try {
        const usersRef = collection(db, "Users");
        // Firestore 'array-contains-any' is limited to 30 values.
        // We'd need to batch this for larger numbers of tokens.
        const q = query(usersRef, where("fcmTokens", "array-contains-any", tokensToDelete.slice(0, 30)));
        const userSnapshots = await getDocs(q);
        
        if (userSnapshots.empty) {
            console.log("[SIMULATION] No users found with tokens to clean up.");
            return;
        }

        const batch = writeBatch(db);
        userSnapshots.forEach(userDoc => {
            const user = userDoc.data() as AppUser;
            const userTokensToDelete = user.fcmTokens.filter(token => tokensToDelete.includes(token));
            
            if (userTokensToDelete.length > 0) {
                 batch.update(userDoc.ref, {
                    fcmTokens: arrayRemove(...userTokensToDelete)
                });
            }
        });

        await batch.commit();
        console.log(`[SIMULATION] Successfully cleaned up tokens from ${userSnapshots.size} users.`);

    } catch(error) {
        console.error("[SIMULATION] Error during token cleanup:", error);
    }
    */
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

  // --- REAL IMPLEMENTATION REQUIRES FIREBASE ADMIN SDK ON A SECURE BACKEND ---
  // The following code simulates the logic but cannot perform the actual sending or cleanup
  // because the Admin SDK is not available in this environment.

  // 1. Fetch target tokens (Using client SDK for simulation)
  console.log(`[SIMULATION] Fetching tokens for target: ${targetType}`);
  const tokens = await getTokensForTarget(targetType, targetValue);
  if (tokens.length === 0) {
      console.log("[SIMULATION] No target tokens found.");
      revalidatePath("/dashboard/notifications");
      return { message: "Simulación completada: No se encontraron destinatarios." };
  }
  console.log(`[SIMULATION] Found ${tokens.length} tokens to target.`);


  // 2. Send message and get response (Simulated)
  // In a real app: const response = await admin.messaging().sendEachForMulticast({ ... });
  // We simulate a response where every second token is invalid for demonstration.
  console.log(`[SIMULATION] Sending notification to ${tokens.length} tokens.`);
  const simulatedResponse = {
      responses: tokens.map((_token, index) => {
          if (index % 2 !== 0 && tokens.length > 1) { // Fails for odd indexes
              return { success: false, error: { code: 'messaging/registration-token-not-registered' } };
          }
          return { success: true };
      }),
      successCount: Math.ceil(tokens.length / 2),
      failureCount: Math.floor(tokens.length / 2),
  };
  
  // 3. Identify invalid tokens from the simulated response
  const tokensToDelete: string[] = [];
  simulatedResponse.responses.forEach((result, index) => {
    if (!result.success) {
      const error = result.error;
      const invalidTokenCodes = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
      if (error && invalidTokenCodes.includes(error.code)) {
        tokensToDelete.push(tokens[index]);
      }
    }
  });

  // 4. Trigger token cleanup logic (Simulated)
  if (tokensToDelete.length > 0) {
    await cleanupInvalidTokens(tokensToDelete);
  }

  console.log("[SIMULATION] Notification process complete.");
  console.log("[SIMULATION] Success count:", simulatedResponse.successCount);
  console.log("[SIMULATION] Failure count:", simulatedResponse.failureCount);
  if (tokensToDelete.length > 0) {
    console.log(`[SIMULATION] Identified ${tokensToDelete.length} tokens for cleanup:`, tokensToDelete);
  }

  revalidatePath("/dashboard/notifications");
  return { message: "Proceso de envío de notificación simulado exitosamente." };
}
