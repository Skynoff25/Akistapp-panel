"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

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

  // In a real application, this is where you would use the Firebase Admin SDK (in a secure backend environment, like a Cloud Function)
  // to send a multicast message and handle token cleanup.
  //
  // --- Example of a real implementation flow ---
  //
  // 1. Initialize Firebase Admin SDK.
  //    const admin = require('firebase-admin');
  //    admin.initializeApp();
  //
  // 2. Fetch the target FCM tokens from Firestore based on `targetType`.
  //    let tokens = []; // e.g. ['token1', 'token2', 'token3']
  //    if (validatedFields.data.targetType === 'all') { /* fetch all users' tokens */ }
  //    // ... logic for other target types ...
  //
  // 3. Construct the message payload.
  //    const message = {
  //      notification: { title: validatedFields.data.title, message: validatedFields.data.message },
  //      tokens: tokens,
  //    };
  //
  // 4. Send the message.
  //    const response = await admin.messaging().sendEachForMulticast(message);
  //
  // 5. **Handle token cleanup based on the response.** This is the key to avoiding stale tokens.
  //    const tokensToDelete = [];
  //    response.responses.forEach((result, index) => {
  //      const error = result.error;
  //      if (error) {
  //        console.error('Failure sending notification to', tokens[index], error);
  //        // Cleanup the tokens that are not registered anymore.
  //        if (error.code === 'messaging/invalid-registration-token' ||
  //            error.code === 'messaging/registration-token-not-registered') {
  //          tokensToDelete.push(tokens[index]);
  //        }
  //      }
  //    });
  //
  // 6. If there are tokens to delete, remove them from your database.
  //    if (tokensToDelete.length > 0) {
  //       // You would need to query for users who have these tokens and remove them.
  //       // For example, find the user doc and use `FieldValue.arrayRemove(...tokensToDelete)`.
  //       console.log("Tokens to delete:", tokensToDelete);
  //    }
  //
  // Since the Admin SDK is not available in this environment, this action
  // will simulate a successful sending.
  
  console.log("Simulating sending push notification:", validatedFields.data);

  revalidatePath("/dashboard/notifications");
  return { message: "Notificación enviada exitosamente (simulación)." };
}
