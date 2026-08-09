import { z } from "zod";

const numOrStr = z.union([z.number(), z.string()]);

export const createProductSchema = z.object({
  code: z.string().min(1, "Thiếu mã sản phẩm (MA_SP)"),
  name: z.string().min(1, "Thiếu tên sản phẩm (TEN_SP)"),
  unit: z.string().nullish(),
  giaMua: numOrStr.nullish(), // null/"" = hết hàng
  haoHut: numOrStr.optional(), // %
  vanChuyen: numOrStr.optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  note: z.string().nullish(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
