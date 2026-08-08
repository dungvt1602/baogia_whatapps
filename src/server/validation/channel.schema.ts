import { z } from "zod";

export const createChannelSchema = z.object({
  name: z.string().min(1, "Thiếu tên kênh"),
  type: z.string().min(1, "Thiếu loại kênh"), // TELEGRAM | ZALO | WHATSAPP
  accountId: z.string().min(1, "Thiếu account id"),
  apiKeyEnv: z.string().min(1, "Thiếu tên biến env chứa API key"),
  note: z.string().nullish(),
});
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
