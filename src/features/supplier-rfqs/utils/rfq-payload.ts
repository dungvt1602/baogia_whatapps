import { fromLocalInput, parseDecimalInput } from "@/features/supplier-rfqs/utils/format";
import type { RfqDetail } from "@/features/supplier-rfqs/types";

/*
 * Form -> payload cho API RFQ. Giữ ở dạng hàm thuần để test được:
 *  - Dòng hàng trống hoàn toàn bị bỏ qua (người dùng bấm "thêm dòng" rồi không điền).
 *  - Số lượng là chuỗi thập phân (không âm); gõ "1,5" được chuẩn hoá thành "1.5".
 */
export type ItemDraft = { key: string; product: string; spec: string; unit: string; quantity: string; note: string };
export type RfqInfoForm = { title: string; note: string; currency: string; deadline: string };
export type ItemPayload = { product: string; spec?: string; unit?: string; quantity?: string; note?: string };
export type ItemErrors = Record<string, { product?: string; quantity?: string }>;

let seq = 0;
export function newItemDraft(init: Partial<Omit<ItemDraft, "key">> = {}): ItemDraft {
  seq += 1;
  return { key: `row-${seq}`, product: "", spec: "", unit: "", quantity: "", note: "", ...init };
}

export function itemsToDrafts(items: RfqDetail["items"]): ItemDraft[] {
  return items.map((it) =>
    newItemDraft({ product: it.product, spec: it.spec ?? "", unit: it.unit ?? "", quantity: it.quantity ?? "", note: it.note ?? "" }),
  );
}

const isBlank = (d: ItemDraft) => !d.product.trim() && !d.spec.trim() && !d.unit.trim() && !d.quantity.trim() && !d.note.trim();

export type ItemsValidation = { ok: boolean; items: ItemPayload[]; errors: ItemErrors; empty: boolean };

export function validateItems(drafts: ItemDraft[]): ItemsValidation {
  const items: ItemPayload[] = [];
  const errors: ItemErrors = {};
  for (const d of drafts) {
    if (isBlank(d)) continue;
    const e: { product?: string; quantity?: string } = {};
    if (!d.product.trim()) e.product = "Nhập tên mặt hàng";
    const q = parseDecimalInput(d.quantity);
    if (!q.ok) e.quantity = q.message ?? "Số lượng phải là số không âm";
    if (e.product || e.quantity) {
      errors[d.key] = e;
      continue;
    }
    const it: ItemPayload = { product: d.product.trim() };
    if (d.spec.trim()) it.spec = d.spec.trim();
    if (d.unit.trim()) it.unit = d.unit.trim();
    if (q.ok && q.value) it.quantity = q.value;
    if (d.note.trim()) it.note = d.note.trim();
    items.push(it);
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors && items.length > 0, items, errors, empty: items.length === 0 && !hasErrors };
}

export function createPayload(form: RfqInfoForm, items: ItemPayload[]) {
  const out: { title: string; note?: string; currency: string; deadline?: string; items: ItemPayload[] } = {
    title: form.title.trim(),
    currency: form.currency.trim().toUpperCase() || "VND",
    items,
  };
  if (form.note.trim()) out.note = form.note.trim();
  const iso = fromLocalInput(form.deadline);
  if (iso) out.deadline = iso;
  return out;
}

/*
 * PATCH thông tin RFQ. Hạn: nếu người dùng XOÁ hạn đã có thì gửi null để BE xoá;
 * nếu chưa từng có hạn và vẫn để trống thì bỏ field (không gửi gì).
 */
export function infoPatchPayload(form: RfqInfoForm, hadDeadline: boolean) {
  const out: { title: string; note: string; currency: string; deadline?: string | null } = {
    title: form.title.trim(),
    note: form.note.trim(),
    currency: form.currency.trim().toUpperCase() || "VND",
  };
  const iso = fromLocalInput(form.deadline);
  if (iso) out.deadline = iso;
  else if (hadDeadline) out.deadline = null;
  return out;
}

export function infoFromDetail(d: Pick<RfqDetail, "title" | "note" | "currency">, deadlineLocal: string): RfqInfoForm {
  return { title: d.title, note: d.note ?? "", currency: d.currency, deadline: deadlineLocal };
}
