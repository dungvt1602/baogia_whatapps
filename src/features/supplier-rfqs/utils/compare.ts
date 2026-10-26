import type { CompareData, CompareRow } from "@/features/supplier-rfqs/types";
import { compareDecimal } from "@/features/supplier-rfqs/utils/format";

/*
 * Dựng ma trận "mặt hàng × NCC" cho tab So sánh giá từ phản hồi `GET .../compare`.
 *  - `prices[i]` của mỗi dòng ứng với `suppliers[i]` (cùng thứ tự theo hợp đồng).
 *  - Giá thấp nhất lấy từ `bestInvitationId` của BE; nếu BE không trả thì tự tính (so sánh
 *    chuỗi thập phân, không qua Number). Hoà giá: tô tất cả NCC bằng giá thấp nhất.
 *  - Giá của các tiền tệ khác nhau KHÔNG so được với nhau: nếu các NCC có giá dùng nhiều
 *    tiền tệ thì không tô "thấp nhất" ở đâu cả (UI hiện ghi chú).
 */
export type MatrixCell = {
  invitationId: string;
  unitPrice: string;
  moq: string | null;
  leadTimeDays: number | string | null;
  note: string | null;
  isBest: boolean;
};
export type MatrixRow = {
  itemId: string;
  no: number | string;
  product: string;
  unit: string | null;
  quantity: string | null;
  cells: (MatrixCell | null)[];
};

// Các invitationId đang là giá thấp nhất của 1 dòng.
export function bestInvitationIds(row: CompareRow): Set<string> {
  const prices = row.prices.filter((p): p is NonNullable<typeof p> => !!p);
  if (prices.length === 0) return new Set();
  if (row.bestInvitationId) {
    const best = prices.find((p) => p.invitationId === row.bestInvitationId);
    if (best) {
      // Gộp cả NCC cùng giá với best (hoà giá) để cùng được tô.
      return new Set(prices.filter((p) => compareDecimal(p.unitPrice, best.unitPrice) === 0).map((p) => p.invitationId));
    }
  }
  let min = prices[0].unitPrice;
  for (const p of prices) if (compareDecimal(p.unitPrice, min) < 0) min = p.unitPrice;
  return new Set(prices.filter((p) => compareDecimal(p.unitPrice, min) === 0).map((p) => p.invitationId));
}

// Các NCC CÓ GIÁ (ít nhất 1 ô) đang dùng nhiều hơn 1 tiền tệ? (NCC không ghi tiền tệ = tiền tệ của RFQ)
export function isMixedCurrency(data: CompareData): boolean {
  const cur = new Set<string>();
  data.suppliers.forEach((s, i) => {
    if (data.rows.some((r) => r.prices[i])) cur.add((s.currency || data.rfq.currency || "").toUpperCase());
  });
  return cur.size > 1;
}

export function buildMatrix(data: CompareData): MatrixRow[] {
  const mixed = isMixedCurrency(data);
  return data.rows.map((row) => {
    // Chỉ tô "thấp nhất" khi có từ 2 giá cùng tiền tệ trở lên — 1 NCC duy nhất thì không có gì để so.
    const count = row.prices.filter(Boolean).length;
    const best = count >= 2 && !mixed ? bestInvitationIds(row) : new Set<string>();
    return {
      itemId: row.itemId,
      no: row.no,
      product: row.product,
      unit: row.unit,
      quantity: row.quantity,
      cells: data.suppliers.map((_, i) => {
        const p = row.prices[i] ?? null;
        return p ? { ...p, isBest: best.has(p.invitationId) } : null;
      }),
    };
  });
}

// Số NCC đã nộp giá (có version) — cho dòng tóm tắt/empty state.
export function submittedSupplierCount(data: CompareData): number {
  return data.suppliers.filter((s) => s.submittedAt != null).length;
}
