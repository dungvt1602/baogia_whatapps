import type { PublicRfq } from "@/features/supplier-rfqs/types";
import { isZeroDecimal, parseDecimalInput } from "@/features/supplier-rfqs/utils/format";

/*
 * Logic form NCC nhập giá (trang công khai /ncc/[token]) — hàm thuần, không đụng DOM/mạng.
 * Quy tắc phản chiếu hợp đồng BE để bắt lỗi sớm trên điện thoại NCC:
 *  - đơn giá / MOQ: số không âm (chuỗi thập phân, không ép number);
 *  - đơn giá phải > 0 (BE); thời gian giao: số nguyên 0..3650 ngày;
 *  - số có dấu phân cách mơ hồ ("25.000") bị từ chối thay vì hiểu sai (xem parseDecimalInput);
 *  - mặt hàng KHÔNG có đơn giá thì không gửi (NCC được báo một phần), nhưng phải có ít nhất 1 giá;
 *  - hàng có MOQ/ngày giao/ghi chú mà thiếu đơn giá -> báo lỗi ở ô đơn giá (BE bắt buộc unitPrice).
 */
export type QuoteRowDraft = { rfqItemId: string; unitPrice: string; moq: string; leadTimeDays: string; note: string };
export type QuoteFormState = { currency: string; validUntil: string; note: string; rows: QuoteRowDraft[] };
export type RowErrors = { unitPrice?: string; moq?: string; leadTimeDays?: string };

export type QuotePayload = {
  currency: string;
  validUntil?: string;
  note?: string;
  items: { rfqItemId: string; unitPrice: string; moq?: string; leadTimeDays?: number; note?: string }[];
};

export type QuoteValidation = {
  ok: boolean;
  payload?: QuotePayload;
  rowErrors: Record<string, RowErrors>;
  formError?: string;
  currencyError?: string;
  validUntilError?: string;
};

// Khởi tạo form: điền sẵn từ báo giá đã nộp (quote) nếu có, ngược lại để trống + tiền tệ của RFQ.
export function initQuoteForm(data: PublicRfq): QuoteFormState {
  const q = data.quote;
  return {
    // Tiền tệ cố định theo RFQ (BE từ chối tiền tệ khác) — không lấy từ quote cũ, không cho sửa.
    currency: data.rfq.currency || "VND",
    validUntil: q?.validUntil ? q.validUntil.slice(0, 10) : "",
    note: q?.note ?? "",
    rows: data.items.map((it) => {
      const v = q?.items.find((x) => String(x.rfqItemId) === String(it.id));
      return {
        rfqItemId: it.id,
        unitPrice: v?.unitPrice ?? "",
        moq: v?.moq ?? "",
        leadTimeDays: v?.leadTimeDays != null ? String(v.leadTimeDays) : "",
        note: v?.note ?? "",
      };
    }),
  };
}

const isValidYmd = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export function validateQuote(form: QuoteFormState): QuoteValidation {
  const rowErrors: Record<string, RowErrors> = {};
  const items: QuotePayload["items"] = [];

  for (const r of form.rows) {
    const e: RowErrors = {};
    const price = parseDecimalInput(r.unitPrice);
    const moq = parseDecimalInput(r.moq);
    const lead = r.leadTimeDays.trim();
    const hasExtra = !!(r.moq.trim() || lead || r.note.trim());

    if (!price.ok) e.unitPrice = price.message ?? "Đơn giá phải là số lớn hơn 0";
    else if (!price.value && hasExtra) e.unitPrice = "Nhập đơn giá cho mặt hàng này";
    else if (price.value && isZeroDecimal(price.value)) e.unitPrice = "Đơn giá phải lớn hơn 0";
    if (!moq.ok) e.moq = moq.message ?? "MOQ phải là số không âm";
    if (lead && (!/^\d+$/.test(lead) || Number(lead) > 3650)) e.leadTimeDays = "Số ngày phải là số nguyên từ 0 đến 3650";

    if (e.unitPrice || e.moq || e.leadTimeDays) {
      rowErrors[r.rfqItemId] = e;
      continue;
    }
    if (!price.ok || !price.value) continue; // không báo giá mặt hàng này
    const item: QuotePayload["items"][number] = { rfqItemId: r.rfqItemId, unitPrice: price.value };
    if (moq.ok && moq.value) item.moq = moq.value;
    if (lead) item.leadTimeDays = Number(lead);
    if (r.note.trim()) item.note = r.note.trim();
    items.push(item);
  }

  const out: QuoteValidation = { ok: false, rowErrors };
  const currency = form.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) out.currencyError = "Tiền tệ là mã 3 chữ cái (VD: VND, USD)";
  if (form.validUntil && !isValidYmd(form.validUntil)) out.validUntilError = "Ngày hiệu lực không hợp lệ";

  if (Object.keys(rowErrors).length > 0) out.formError = "Vui lòng sửa các ô báo đỏ bên dưới.";
  else if (items.length === 0) out.formError = "Vui lòng nhập đơn giá cho ít nhất một mặt hàng.";

  if (out.formError || out.currencyError || out.validUntilError) return out;

  const payload: QuotePayload = { currency, items };
  if (form.validUntil) payload.validUntil = form.validUntil;
  if (form.note.trim()) payload.note = form.note.trim();
  return { ok: true, payload, rowErrors };
}
