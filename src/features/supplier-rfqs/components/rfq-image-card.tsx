"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { apiUrl, sendJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { BTN_DANGER, BTN_GHOST } from "@/components/shared/modal";

const MAX_BYTES = 5 * 1024 * 1024; // khớp giới hạn 5MB của BE

/*
 * Ảnh minh hoạ của RFQ (hiện trong tin Zalo và trên trang NCC). Upload bằng body thô `image/*`
 * (cùng cách với ảnh template). `?v=` đổi mỗi lần up/xoá để trình duyệt không giữ ảnh cũ trong cache.
 */
export default function RfqImageCard({ rfqId, hasImage, locked = false, onChanged }: { rfqId: string; hasImage: boolean; locked?: boolean; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState(0);
  const [broken, setBroken] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("File phải là ảnh.");
    if (file.size > MAX_BYTES) return void toast.error("Ảnh quá lớn (tối đa 5MB).");
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/supplier-rfqs/${rfqId}/image`), {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string })?.error || `Lỗi ${res.status}`);
      setVer(Date.now());
      setBroken(false);
      toast.success("Đã cập nhật ảnh");
      onChanged();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Không tải ảnh lên được"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await sendJSON("DELETE", `/api/supplier-rfqs/${rfqId}/image`);
      setVer(Date.now());
      toast.success("Đã xóa ảnh");
      onChanged();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Không xóa được ảnh"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-2 text-[13px] font-bold text-[#14261A]">Ảnh đính kèm</div>
      {hasImage && !broken ? (
        <img
          src={apiUrl(`/api/supplier-rfqs/${rfqId}/image?v=${ver}`)}
          alt="Ảnh RFQ"
          className="mb-2 max-h-[260px] max-w-full rounded-[10px] border border-[#E4EAEF] bg-[#F4F6F3] object-contain"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="mb-2 rounded-[10px] border border-dashed border-[#CBD6CD] bg-[#F7FAF7] p-4 text-center text-[12.5px] text-[#8B9A90]">Chưa có ảnh</div>
      )}
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0])} />
        <button type="button" disabled={busy || locked} className={BTN_GHOST} onClick={() => fileRef.current?.click()}>
          {busy ? "Đang xử lý..." : hasImage ? "Thay ảnh" : "Tải ảnh lên"}
        </button>
        {hasImage && (
          <button type="button" disabled={busy || locked} className={BTN_DANGER} onClick={remove}>
            Xóa ảnh
          </button>
        )}
      </div>
      <div className="mt-1.5 text-[11.5px] text-[#8B9A90]">{locked ? "Báo giá đã đóng nên không đổi được ảnh." : "JPG/PNG, tối đa 5MB."}</div>
    </div>
  );
}
