import { z } from "zod";

const numOrStr = z.union([z.number(), z.string()]);

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Thiếu tên template"),
  icon: z.string().nullish(),
  body: z.string().nullish(),
  content: z.string().nullish(), // alias của body
  channelId: numOrStr.nullish(),
  waTemplateName: z.string().nullish(),
  waLanguage: z.string().optional(),
  waCategory: z.string().nullish(),
  waImage: z.boolean().optional(),
  waBodyParams: z.string().nullish(), // "customer_name={khách hàng}" hoặc "{khách hàng}, {mã}"
  sendAsText: z.boolean().optional(), // true = gửi text thường thay vì template Meta
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// Sửa template: mọi field của create là tuỳ chọn, thêm quotationId để gắn/gỡ khỏi báo giá (null = về kho).
export const updateTemplateSchema = createTemplateSchema.partial().extend({
  quotationId: numOrStr.nullish(),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
