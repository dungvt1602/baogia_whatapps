import { z } from "zod";

const numOrStr = z.union([z.number(), z.string()]);

export const createProductSchema = z.object({
  name: z.string().min(1, "Thiếu tên sản phẩm"),
  unit: z.string().nullish(),
  packing: z.string().nullish(),
  price: numOrStr.optional(),
  currency: z.string().optional(),
  market: z.string().nullish(),
  note: z.string().nullish(),
  isActive: z.boolean().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
