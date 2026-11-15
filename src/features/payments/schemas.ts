import { z } from "zod";

export const updatePaymentPreferencesSchema = z.object({
  isOnlineEnabled: z.boolean().default(false),
  isCodEnabled: z.boolean().default(true),
  supportedMethods: z
    .array(z.enum(["card", "upi", "netbanking", "wallet"]))
    .default(["card", "upi", "netbanking", "wallet"]),
});

export type UpdatePaymentPreferencesInput = z.infer<typeof updatePaymentPreferencesSchema>;

