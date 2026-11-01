import { z } from "zod";

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .max(300, "Reason must be under 300 characters")
    .optional()
    .or(z.literal("")),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["confirmed", "shipped", "delivered"], {
    errorMap: () => ({ message: "Invalid status transition" }),
  }),
  note: z.string().max(300, "Note must be under 300 characters").optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["pending", "paid", "refunded", "failed"], {
    errorMap: () => ({ message: "Invalid payment status" }),
  }),
  note: z.string().max(300, "Note must be under 300 characters").optional(),
});

export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
