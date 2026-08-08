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
  waImage: z.boolean().optional(),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
