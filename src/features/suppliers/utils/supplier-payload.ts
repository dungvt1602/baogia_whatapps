import type { SupplierForm } from "@/features/suppliers/types";

/*
 * Form -> body gửi backend.
 *  - Tạo mới (POST): chỉ gửi ô có giá trị (ô tuỳ chọn rỗng thì bỏ hẳn).
 *  - Sửa (PATCH, một phần): gửi đủ các ô, ô rỗng gửi "" để cho phép XOÁ giá trị cũ
 *    (cùng quy ước với màn Khách hàng).
 */
export function supplierPayload(form: SupplierForm, mode: "create" | "edit") {
  const base = {
    name: form.name.trim(),
    company: form.company.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    zaloUserId: form.zaloUserId.trim(),
    note: form.note.trim(),
  };
  if (mode === "edit") return base;
  const out: Record<string, string> = { name: base.name };
  for (const k of ["company", "phone", "email", "zaloUserId", "note"] as const) {
    if (base[k]) out[k] = base[k];
  }
  return out;
}

export const emptySupplierForm = (): SupplierForm => ({ name: "", company: "", phone: "", email: "", zaloUserId: "", note: "" });
