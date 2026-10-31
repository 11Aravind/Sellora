import { z } from "zod";

export const planFormSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(40, "Code cannot exceed 40 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Code may only contain lowercase letters, numbers, hyphens, and underscores"
    ),
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().max(255).optional().default(""),
  billingInterval: z.enum(["month", "year"], {
    errorMap: () => ({ message: "Billing interval must be monthly or yearly" }),
  }),
  priceRupees: z
    .coerce
    .number()
    .min(0, "Price cannot be negative"),
  trialDays: z
    .coerce
    .number()
    .int("Trial days must be an integer")
    .min(0, "Trial days cannot be negative")
    .default(0),
  maxProducts: z
    .number()
    .int()
    .min(0)
    .nullable(),
  maxStaff: z
    .number()
    .int()
    .min(0)
    .nullable(),
  maxOrdersPerMonth: z
    .number()
    .int()
    .min(0)
    .nullable(),
  customDomainAllowed: z.boolean().default(false),
  features: z.array(z.string().min(1, "Feature text cannot be empty")).default([]),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type PlanFormInput = z.infer<typeof planFormSchema>;
