import { z } from "zod";

export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be under 100 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
  addressLine1: z
    .string()
    .min(3, "Address line 1 must be at least 3 characters")
    .max(200, "Address line 1 must be under 200 characters"),
  addressLine2: z
    .string()
    .max(200, "Address line 2 must be under 200 characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be under 100 characters"),
  state: z
    .string()
    .min(2, "State must be at least 2 characters")
    .max(100, "State must be under 100 characters"),
  pinCode: z
    .string()
    .regex(/^[0-9]{6}$/, "PIN code must be exactly 6 digits"),
  notes: z
    .string()
    .max(500, "Delivery notes cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
});

export type ShippingAddressFormValues = z.infer<typeof shippingAddressSchema>;

export const customerAuthSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
});

export type CustomerAuthFormValues = z.infer<typeof customerAuthSchema>;

export const placeOrderInputSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  items: z
    .array(
      z.object({
        productId: z.string().uuid("Invalid product ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1").max(100, "Quantity cannot exceed 100"),
      })
    )
    .min(1, "Your cart is empty"),
  shipping: shippingAddressSchema,
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;
