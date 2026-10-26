"use client";

import { FIELD_CLS, LABEL_CLS } from "@/components/shared/modal";
import { CURRENCY_OPTIONS } from "@/features/supplier-rfqs/schemas/rfq-schema";
import type { RfqInfoForm } from "@/features/supplier-rfqs/utils/rfq-payload";

// Các ô thông tin chung của RFQ (dùng cho cả form tạo mới và form sửa ở màn chi tiết).
export default function RfqInfoFields({
  form,
  onChange,
  errors = {},
  disabled = false,
}: {
  form: RfqInfoForm;
  onChange: (f: RfqInfoForm) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const currencies: string[] = [...CURRENCY_OPTIONS];
  if (form.currency && !currencies.includes(form.currency)) currencies.unshift(form.currency);

  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
      <label className="flex flex-col sm:col-span-2">
        <span className={LABEL_CLS}>Tiêu đề *</span>
        <input className={`${FIELD_CLS} ${errors.title ? "!border-[#E4746E]" : ""}`} disabled={disabled} value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} placeholder="VD: Yêu cầu báo giá cam sành tháng 11" />
        {errors.title && <span className="mt-1 text-[11.5px] text-[#B3261E]">{errors.title}</span>}
      </label>
      <label className="flex flex-col">
        <span className={LABEL_CLS}>Tiền tệ</span>
        <select className={`${FIELD_CLS} ${errors.currency ? "!border-[#E4746E]" : ""}`} disabled={disabled} value={form.currency} onChange={(e) => onChange({ ...form, currency: e.target.value })}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.currency && <span className="mt-1 text-[11.5px] text-[#B3261E]">{errors.currency}</span>}
      </label>
      <label className="flex flex-col">
        <span className={LABEL_CLS}>Hạn báo giá</span>
        <input type="datetime-local" className={`${FIELD_CLS} ${errors.deadline ? "!border-[#E4746E]" : ""}`} disabled={disabled} value={form.deadline} onChange={(e) => onChange({ ...form, deadline: e.target.value })} />
        {errors.deadline && <span className="mt-1 text-[11.5px] text-[#B3261E]">{errors.deadline}</span>}
      </label>
      <label className="flex flex-col sm:col-span-2">
        <span className={LABEL_CLS}>Ghi chú gửi NCC</span>
        <textarea
          rows={3}
          className="w-full rounded-[9px] border-[1.5px] border-[#DFE6E0] bg-white p-[11px] text-[13.5px] text-[#14261A] outline-none focus:border-[#3EA85C] disabled:bg-[#F4F6F3]"
          disabled={disabled}
          value={form.note}
          onChange={(e) => onChange({ ...form, note: e.target.value })}
          placeholder="Điều kiện giao hàng, đóng gói, thanh toán..."
        />
        {errors.note && <span className="mt-1 text-[11.5px] text-[#B3261E]">{errors.note}</span>}
      </label>
    </div>
  );
}
