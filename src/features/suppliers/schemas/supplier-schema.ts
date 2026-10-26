import { z } from "zod";

/*
 * Validate form Nhà cung cấp phía FE (bắt lỗi đúng ô trước khi gọi API).
 * Chỉ tên là bắt buộc; các ô còn lại cho phép rỗng. Zalo user_id không bắt buộc
 * vì có thể nhập sau, nhưng NCC thiếu Zalo user_id sẽ KHÔNG gửi được RFQ qua Zalo.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// SĐT: cho phép + đầu, dấu cách/chấm/gạch; đếm chữ số 6-15.
const PHONE_CHARS_RE = /^\+?[\d\s.\-()]+$/;

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} quá dài (tối đa ${max} ký tự)`);

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên nhà cung cấp").max(255, "Tên quá dài (tối đa 255 ký tự)"),
  company: optionalText(255, "Tên công ty"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || (PHONE_CHARS_RE.test(v) && v.replace(/\D/g, "").length >= 6 && v.replace(/\D/g, "").length <= 15), {
      message: "SĐT chỉ gồm 6-15 chữ số",
    }),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || EMAIL_RE.test(v), { message: "Email không hợp lệ" }),
  zaloUserId: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,50}$/.test(v), { message: "Zalo user_id chỉ gồm chữ số (tối đa 50 ký tự)" }),
  note: optionalText(2000, "Ghi chú"),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

// Gom lỗi theo tên ô (mỗi ô lấy lỗi đầu tiên) để hiện dưới từng input.
export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0]);
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
