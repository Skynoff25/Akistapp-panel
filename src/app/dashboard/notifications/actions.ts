"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

const notificationSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio"),
});

export async function sendPushNotification(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = notificationSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // In a real application, this is where you would use the Firebase Admin SDK
  // to send a multicast message to all users' FCM tokens.
  // 1. Initialize Firebase Admin SDK.
  // 2. Fetch all documents from the 'Users' collection.
  // 3. Extract all `fcmTokens` from each user.
  // 4. Construct a multicast message with the title and message.
  // 5. Use `admin.messaging().sendMulticast()` to send the notifications.
  //
  // Since the Admin SDK is not available in this environment, this action
  // will simulate a successful sending.
  
  console.log("Simulating sending push notification:", validatedFields.data);

  revalidatePath("/dashboard/notifications");
  return { message: "Notificación enviada exitosamente (simulación)." };
}
