import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "Thiếu username"),
  email: z.string().min(1, "Thiếu email"),
  fullName: z.string().nullish(),
  passwordHash: z.string().optional(), // nội bộ: không bắt buộc (đăng nhập dùng localStorage)
  isActive: z.boolean().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  fullName: z.string().nullish(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
