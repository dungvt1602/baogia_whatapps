import { z } from "zod";

const numOrStr = z.union([z.number(), z.string()]);

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Thiếu tên khách"),
  phone: z.string().nullish(),
  whatsappPhone: z.string().nullish(),
  email: z.string().nullish(),
  market: z.string().nullish(),
  status: z.string().optional(),
  receiveQuotation: z.boolean().optional(),
  templateId: numOrStr.nullish(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// PATCH: mọi field optional; templateId có thể null (đưa về kho).
export const patchCustomerSchema = z.object({
  templateId: numOrStr.nullable().optional(),
  name: z.string().optional(),
  phone: z.string().nullish(),
  whatsappPhone: z.string().nullish(),
  email: z.string().nullish(),
  market: z.string().nullish(),
  status: z.string().optional(),
  receiveQuotation: z.boolean().optional(),
});
export type PatchCustomerInput = z.infer<typeof patchCustomerSchema>;
