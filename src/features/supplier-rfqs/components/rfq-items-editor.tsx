"use client";

import { BTN_GHOST } from "@/components/shared/modal";
import { newItemDraft, type ItemDraft, type ItemErrors } from "@/features/supplier-rfqs/utils/rfq-payload";

/*
 * Bảng mặt hàng của RFQ (thêm/xoá dòng, sửa trực tiếp). Controlled: cha giữ `items`.
 * `disabled` dùng khi RFQ không còn ở trạng thái DRAFT (BE chỉ cho sửa mặt hàng lúc nháp).
 */
const CELL = "h-9 w-full rounded-lg border border-[#DFE6E0] bg-white px-2 text-[13px] text-[#14261A] outline-none focus:border-[#3EA85C] disabled:bg-[#F4F6F3] disabled:text-[#4A5A4E]";
const TH = "whitespace-nowrap border border-[#D3DCE3] bg-[#EEF2F5] px-2 py-1.5 text-left text-[11px] font-bold text-[#33475B]";
const TD = "border border-[#E4EAEF] p-1 align-top";

export default function RfqItemsEditor({
  items,
  onChange,
  errors = {},
  disabled = false,
}: {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
  errors?: ItemErrors;
  disabled?: boolean;
}) {
  const patch = (key: string, p: Partial<ItemDraft>) => onChange(items.map((it) => (it.key === key ? { ...it, ...p } : it)));
  const remove = (key: string) => onChange(items.filter((it) => it.key !== key));

  return (
    <div>
      <div className="overflow-auto rounded-[10px] border border-[#D3DCE3] bg-white">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              <th className={`${TH} w-9 text-center`}>#</th>
              <th className={TH}>Mặt hàng *</th>
              <th className={TH}>Quy cách</th>
              <th className={`${TH} w-[90px]`}>Đơn vị</th>
              <th className={`${TH} w-[120px]`}>Số lượng</th>
              <th className={TH}>Ghi chú</th>
              {!disabled && <th className={`${TH} w-10`} />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={disabled ? 6 : 7} className="p-4 text-center text-[13px] text-[#8B9A90]">
                  Chưa có mặt hàng nào.
                </td>
              </tr>
            )}
            {items.map((it, i) => {
              const e = errors[it.key] ?? {};
              return (
                <tr key={it.key}>
                  <td className={`${TD} pt-3 text-center text-[12px] text-[#8B9A90]`}>{i + 1}</td>
                  <td className={TD}>
                    <input aria-label={`Mặt hàng dòng ${i + 1}`} className={`${CELL} ${e.product ? "!border-[#E4746E]" : ""}`} disabled={disabled} value={it.product} onChange={(ev) => patch(it.key, { product: ev.target.value })} placeholder="VD: Cam sành" />
                    {e.product && <div className="mt-0.5 text-[11.5px] text-[#B3261E]">{e.product}</div>}
                  </td>
                  <td className={TD}>
                    <input aria-label={`Quy cách dòng ${i + 1}`} className={CELL} disabled={disabled} value={it.spec} onChange={(ev) => patch(it.key, { spec: ev.target.value })} placeholder="VD: loại 1, 5-7 trái/kg" />
                  </td>
                  <td className={TD}>
                    <input aria-label={`Đơn vị dòng ${i + 1}`} className={CELL} disabled={disabled} value={it.unit} onChange={(ev) => patch(it.key, { unit: ev.target.value })} placeholder="kg" />
                  </td>
                  <td className={TD}>
                    <input aria-label={`Số lượng dòng ${i + 1}`} className={`${CELL} ${e.quantity ? "!border-[#E4746E]" : ""}`} inputMode="decimal" disabled={disabled} value={it.quantity} onChange={(ev) => patch(it.key, { quantity: ev.target.value })} placeholder="1000" />
                    {e.quantity && <div className="mt-0.5 text-[11.5px] text-[#B3261E]">{e.quantity}</div>}
                  </td>
                  <td className={TD}>
                    <input aria-label={`Ghi chú dòng ${i + 1}`} className={CELL} disabled={disabled} value={it.note} onChange={(ev) => patch(it.key, { note: ev.target.value })} />
                  </td>
                  {!disabled && (
                    <td className={`${TD} text-center`}>
                      <button type="button" title="Xóa dòng" aria-label={`Xóa dòng ${i + 1}`} className="h-9 w-8 cursor-pointer rounded-md border-0 bg-transparent text-[#B3261E]" onClick={() => remove(it.key)}>
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button type="button" className={`${BTN_GHOST} mt-2`} onClick={() => onChange([...items, newItemDraft()])}>
          + Thêm dòng
        </button>
      )}
    </div>
  );
}
