import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "Thiếu username"),
  email: z.string().min(1, "Thiếu email"),
  passwordHash: z.string().min(1, "Thiếu passwordHash"),
  fullName: z.string().nullish(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
