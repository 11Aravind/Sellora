import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Slug validation matching PostgreSQL regex: ^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const onboardingSchema = z.object({
  planCode: z.string().min(1, "Please select a plan"),
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(100, "Store name cannot exceed 100 characters"),
  slug: z
    .string()
    .min(3, "Store slug must be at least 3 characters")
    .max(40, "Store slug cannot exceed 40 characters")
    .regex(
      SLUG_REGEX,
      "Slug must contain only lowercase letters, numbers, and hyphens (cannot start or end with a hyphen)"
    ),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
