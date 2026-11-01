import { z } from "zod";

export const saveNotificationTokenSchema = z.object({
  tenantId: z.string().uuid().optional().nullable(),
  token: z.string().min(10, "Invalid device registration token"),
  platform: z.enum(["web", "android", "ios"]).default("web"),
});

export const markNotificationReadSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

export const markAllNotificationsReadSchema = z.object({
  tenantId: z.string().uuid().optional().nullable(),
});

export const unregisterTokenSchema = z.object({
  token: z.string().min(10, "Invalid device registration token"),
});
