"use client";

import { useState } from "react";
import { toast } from "sonner";
import { postJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { BTN_GHOST, BTN_GREEN, Modal } from "@/components/shared/modal";
import RfqInfoFields from "@/features/supplier-rfqs/components/rfq-info-fields";
import RfqItemsEditor from "@/features/supplier-rfqs/components/rfq-items-editor";
import { rfqFieldErrors, rfqInfoSchema } from "@/features/supplier-rfqs/schemas/rfq-schema";
import { createPayload, newItemDraft, validateItems, type ItemDraft, type ItemErrors, type RfqInfoForm } from "@/features/supplier-rfqs/utils/rfq-payload";
import type { RfqDetail } from "@/features/supplier-rfqs/types";

// Tạo RFQ mới (trạng thái nháp). Xong thì chuyển sang màn chi tiết để up ảnh và chọn NCC gửi.
export default function RfqCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (rfq: RfqDetail) => void }) {
  const [info, setInfo] = useState<RfqInfoForm>({ title: "", note: "", currency: "VND", deadline: "" });
  const [items, setItems] = useState<ItemDraft[]>(() => [newItemDraft(), newItemDraft(), newItemDraft()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<ItemErrors>({});
  const [itemsMsg, setItemsMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = rfqInfoSchema.safeParse(info);
    const fe = parsed.success ? {} : rfqFieldErrors(parsed.error.issues);
    const v = validateItems(items);
    setErrors(fe);
    setItemErrors(v.errors);
    setItemsMsg(v.empty ? "Cần ít nhất một mặt hàng." : Object.keys(v.errors).length ? "Sửa các dòng báo đỏ." : "");
    if (Object.keys(fe).length > 0 || !v.ok) return;
    setSaving(true);
    try {
      const rfq = await postJSON<RfqDetail>("/api/supplier-rfqs", createPayload(info, v.items));
      toast.success(`Đã tạo ${rfq.code}`);
      onCreated(rfq);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Không tạo được yêu cầu báo giá"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Tạo yêu cầu báo giá" onClose={onClose} maxWidth={860} busy={saving}>
      <RfqInfoFields form={info} onChange={setInfo} errors={errors} />
      <div className="mb-1.5 mt-5 text-[13px] font-bold text-[#14261A]">Mặt hàng cần báo giá</div>
      <RfqItemsEditor items={items} onChange={setItems} errors={itemErrors} />
      {itemsMsg && <div className="mt-1.5 text-[12.5px] text-[#B3261E]">{itemsMsg}</div>}
      <div className="mt-5 flex gap-2.5">
        <button type="button" disabled={saving} className={`${BTN_GREEN} !h-11 flex-1`} onClick={submit}>
          {saving ? "Đang tạo..." : "Tạo yêu cầu báo giá"}
        </button>
        <button type="button" disabled={saving} className={`${BTN_GHOST} !h-11`} onClick={onClose}>
          Hủy
        </button>
      </div>
    </Modal>
  );
}
