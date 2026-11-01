import { z } from "zod";

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(2, "Store name must be at least 2 characters").max(100),
  logoUrl: z.string().url("Valid image URL required").nullable().optional().or(z.literal("")),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Valid hex color required (e.g. #0f172a)")
    .default("#0f172a"),
  tagline: z.string().trim().max(150, "Tagline cannot exceed 150 characters").nullable().optional(),
  bannerUrl: z.string().url("Valid image URL required").nullable().optional().or(z.literal("")),
  contactEmail: z.string().trim().email("Valid email address required").nullable().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

export const customDomainSchema = z.object({
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/,
      "Enter a valid domain name (e.g. shop.example.com)"
    )
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type CustomDomainInput = z.infer<typeof customDomainSchema>;

export const addMemberSchema = z.object({
  email: z.string().trim().email("Valid email address required"),
  role: z.enum(["admin", "staff"], {
    message: "Role must be either admin or staff",
  }),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "staff"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
