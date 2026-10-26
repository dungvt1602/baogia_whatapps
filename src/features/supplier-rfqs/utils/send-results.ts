import type { SendResult } from "@/features/supplier-rfqs/types";

/*
 * Phân loại kết quả `POST .../send` theo từng NCC:
 *  - failed:  ok=false (Zalo/BE từ chối);
 *  - skipped: ok=true nhưng có `error` (VD "Đã gửi trước đó.") -> BE bỏ qua, KHÔNG tính là đã gửi;
 *  - sent:    ok=true, không có error.
 */
export type ResultKind = "sent" | "skipped" | "failed";

export function resultKind(r: SendResult): ResultKind {
  if (!r.ok) return "failed";
  return r.error ? "skipped" : "sent";
}

export function summarizeResults(results: SendResult[]): { sent: number; skipped: number; failed: number } {
  const out = { sent: 0, skipped: 0, failed: 0 };
  for (const r of results) out[resultKind(r)] += 1;
  return out;
}
