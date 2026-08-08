import { z } from "zod";

const numOrStr = z.union([z.number(), z.string()]);

export const createQuotationSchema = z.object({
  code: z.string().min(1, "Thiếu mã báo giá"),
  title: z.string().nullish(),
  totalAmount: numOrStr.optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  market: z.string().nullish(),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const itemSchema = z.object({
  no: z.number().optional(),
  product: z.string().default(""),
  packing: z.string().nullish(),
  unit: z.string().nullish(),
  quantity: numOrStr.optional(),
  price: numOrStr.optional(),
  note: z.string().nullish(),
});
export const setItemsSchema = z.object({ items: z.array(itemSchema).default([]) });
export type SetItemsInput = z.infer<typeof setItemsSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
