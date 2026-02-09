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

  const { title, message, targetType, targetValue } = validatedFields.data;

  // SIMULATION: In a real environment, you'd use the Firebase Admin SDK here
  // to fetch tokens and send messages.
  // This is blocked due to environment credentials not being configured.
  console.log('[SIMULATION] Sending push notification:');
  console.log({ title, message, targetType, targetValue });

  const simulatedSuccessCount = Math.floor(Math.random() * 100) + 1;
  const simulatedTotalCount = simulatedSuccessCount + Math.floor(Math.random() * 5);
  
  console.log(`[SIMULATION] Notification sent to ${simulatedSuccessCount} of ${simulatedTotalCount} devices.`);

  revalidatePath("/dashboard/notifications");
  return { message: `Notificación enviada a ${simulatedSuccessCount} de ${simulatedTotalCount} dispositivos (Simulación).` };
}
