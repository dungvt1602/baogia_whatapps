import { z } from "zod";

/*
 * Validate phần thông tin chung của RFQ (tiêu đề, tiền tệ, hạn) trước khi gọi API.
 * Bảng mặt hàng được validate riêng ở utils/rfq-payload.ts (validateItems) vì lỗi gắn theo từng dòng.
 */
export const rfqInfoSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề").max(255, "Tiêu đề quá dài (tối đa 255 ký tự)"),
  note: z.string().trim().max(4000, "Ghi chú quá dài (tối đa 4000 ký tự)"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Tiền tệ là mã 3 chữ cái (VD: VND, USD)"),
  deadline: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), { message: "Hạn báo giá không hợp lệ" }),
});
export type RfqInfoInput = z.infer<typeof rfqInfoSchema>;

// Zalo user_id theo BE: chỉ chữ số, 1-50 ký tự.
export const ZALO_USER_ID_RE = /^\d{1,50}$/;
export const ZALO_USER_ID_MSG = "Zalo user_id chỉ gồm chữ số (tối đa 50 ký tự)";

export const CURRENCY_OPTIONS = ["VND", "USD", "EUR", "CNY", "THB", "INR", "JPY", "KRW"] as const;

export function rfqFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0]);
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
