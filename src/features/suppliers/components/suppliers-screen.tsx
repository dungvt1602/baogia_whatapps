"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getJSON, postJSON, patchJSON, sendJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { SkeletonRows } from "@/components/shared/ui";
import { MissingZaloBadge } from "@/components/shared/badge";
import { BTN_GHOST, BTN_GREEN, ConfirmDialog, FIELD_CLS, LABEL_CLS, Modal } from "@/components/shared/modal";
import type { Supplier, SupplierForm } from "@/features/suppliers/types";
import { fieldErrors, supplierSchema } from "@/features/suppliers/schemas/supplier-schema";
import { emptySupplierForm, supplierPayload } from "@/features/suppliers/utils/supplier-payload";

const TH = "sticky top-0 whitespace-nowrap border border-[#D3DCE3] bg-[#EEF2F5] px-2 py-1.5 text-left text-[11px] font-bold text-[#33475B]";
const TD = "border border-[#E4EAEF] px-2 py-[7px] text-[12.5px] text-[#1B2A20]";

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
}) {
  return (
    <label className="mb-3 flex flex-col">
      <span className={LABEL_CLS}>{label}</span>
      <input
        className={`${FIELD_CLS} ${error ? "!border-[#E4746E]" : ""}`}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="mt-1 text-[11.5px] leading-snug text-[#6B7A70]">{hint}</span>}
      {error && <span className="mt-1 text-[11.5px] text-[#B3261E]">{error}</span>}
    </label>
  );
}

export default function SuppliersScreen() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [form, setForm] = useState<SupplierForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const reqId = useRef(0); // chỉ nhận kết quả của lần gọi mới nhất khi gõ tìm kiếm nhanh

  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    try {
      const qs = debouncedQ ? `?search=${encodeURIComponent(debouncedQ)}` : "";
      const data = await getJSON<Supplier[]>(`/api/suppliers${qs}`);
      if (my !== reqId.current) return;
      setRows(data);
      setErr("");
    } catch (e) {
      if (my === reqId.current) setErr(apiErrorMessage(e, "Không tải được danh sách nhà cung cấp"));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // Chờ ngừng gõ 300ms mới gọi server.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  function openAdd() {
    setErrors({});
    setForm(emptySupplierForm());
  }
  function openEdit(s: Supplier) {
    setErrors({});
    setForm({
      id: s.id,
      name: s.name,
      company: s.company || "",
      phone: s.phone || "",
      email: s.email || "",
      zaloUserId: s.zaloUserId || "",
      note: s.note || "",
    });
  }

  async function save() {
    if (!form) return;
    const parsed = supplierSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setSaving(true);
    const editing = !!form.id;
    try {
      if (form.id) await patchJSON(`/api/suppliers/${form.id}`, supplierPayload(form, "edit"));
      else await postJSON("/api/suppliers", supplierPayload(form, "create"));
      setForm(null);
      await load();
      toast.success(editing ? "Đã cập nhật nhà cung cấp" : "Đã thêm nhà cung cấp");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Không lưu được nhà cung cấp"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await sendJSON("DELETE", `/api/suppliers/${toDelete.id}`);
      toast.success("Đã xóa nhà cung cấp");
      setToDelete(null);
      await load();
    } catch (e) {
      // 400 nếu NCC đã có lời mời RFQ — hiện nguyên thông báo của backend.
      toast.error(apiErrorMessage(e, "Không xóa được nhà cung cấp"));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const missingZalo = rows.filter((r) => !r.zaloUserId).length;

  return (
    <div>
      {err && <div className="mb-3 rounded-[10px] border border-[#F3C9C6] bg-[#FDECEC] px-3.5 py-2.5 text-[13px] text-[#B3261E]">{err}</div>}

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[280px]">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[13px] text-[#9AA7A0]">🔍</span>
          <input
            className={`${FIELD_CLS} !h-[38px] !pl-8`}
            placeholder="Tìm tên, công ty, SĐT, email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="text-[12.5px] text-[#7B8A80]">
          {rows.length} nhà cung cấp{missingZalo ? ` · ${missingZalo} chưa có Zalo` : ""}
        </div>
        <div className="flex-1" />
        <button type="button" className={BTN_GREEN} onClick={openAdd}>
          + Thêm nhà cung cấp
        </button>
      </div>

      <div className="max-h-[calc(100vh-200px)] overflow-auto rounded-[10px] border border-[#D3DCE3] bg-white">
        <table className={`w-full min-w-[820px] border-collapse transition-opacity ${loading && rows.length ? "opacity-55" : ""}`}>
          <thead>
            <tr>
              <th className={`${TH} w-11 text-center`}>No.</th>
              <th className={TH}>Tên</th>
              <th className={TH}>Công ty</th>
              <th className={TH}>SĐT</th>
              <th className={TH}>Email</th>
              <th className={TH}>Zalo user_id</th>
              <th className={TH}>Ghi chú</th>
              <th className={`${TH} w-[110px] text-center`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && <SkeletonRows cols={8} cellStyle="padding:7px 8px; border:1px solid #E4EAEF" />}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className={`${TD} p-6 text-center text-[#8B9A90]`}>
                  {debouncedQ ? "Không tìm thấy nhà cung cấp nào." : "Chưa có nhà cung cấp. Bấm “+ Thêm nhà cung cấp”."}
                </td>
              </tr>
            )}
            {rows.map((s, i) => (
              <tr key={s.id} className={i % 2 ? "bg-[#FBFDFB]" : "bg-white"}>
                <td className={`${TD} text-center text-[#8B9A90]`}>{i + 1}</td>
                <td className={`${TD} max-w-[200px] truncate font-semibold`} title={s.name}>
                  {s.name}
                </td>
                <td className={`${TD} max-w-[180px] truncate`} title={s.company || ""}>
                  {s.company || "—"}
                </td>
                <td className={TD}>{s.phone || "—"}</td>
                <td className={`${TD} max-w-[180px] truncate`} title={s.email || ""}>
                  {s.email || "—"}
                </td>
                <td className={`${TD} tabular-nums`}>{s.zaloUserId ? s.zaloUserId : <MissingZaloBadge />}</td>
                <td className={`${TD} max-w-[200px] truncate text-[#7B8A80]`} title={s.note || ""}>
                  {s.note || "—"}
                </td>
                <td className={`${TD} text-center`}>
                  <div className="flex justify-center gap-1.5">
                    <button type="button" className="h-7 cursor-pointer rounded-md border border-[#DCE3DC] bg-white px-2.5 text-[12px] font-semibold text-[#33475B]" onClick={() => openEdit(s)}>
                      Sửa
                    </button>
                    <button type="button" title="Xóa" aria-label={`Xóa ${s.name}`} className="h-7 w-7 cursor-pointer rounded-md border border-[#E4C7C5] bg-white text-[#B3261E]" onClick={() => setToDelete(s)}>
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11.5px] text-[#8B9A90]">
        Nhà cung cấp cần có Zalo user_id mới nhận được yêu cầu báo giá qua Zalo (ở menu “Báo giá NCC”).
      </div>

      {form && (
        <Modal title={form.id ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"} onClose={() => setForm(null)} busy={saving}>
          <Field label="Tên nhà cung cấp *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="VD: Nguyễn Văn A" error={errors.name} />
          <Field label="Công ty" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="VD: Công ty TNHH ABC" error={errors.company} />
          <div className="flex flex-col gap-x-2.5 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Field label="SĐT" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0901234567" inputMode="tel" error={errors.phone} />
            </div>
            <div className="min-w-0 flex-1">
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="ncc@congty.com" inputMode="email" error={errors.email} />
            </div>
          </div>
          <Field
            label="Zalo user_id"
            value={form.zaloUserId}
            onChange={(v) => setForm({ ...form, zaloUserId: v })}
            placeholder="VD: 2512345678901234567"
            error={errors.zaloUserId}
            hint="Là mã người dùng Zalo của NCC (không phải số điện thoại). Lấy ở màn Zalo OA (danh sách người đã quan tâm / nhắn tin cho OA) hoặc từ webhook khi NCC nhắn cho OA. NCC phải đã quan tâm hoặc nhắn OA thì Zalo mới cho gửi tin."
          />
          <Field label="Ghi chú" value={form.note} onChange={(v) => setForm({ ...form, note: v })} placeholder="Tuỳ chọn" error={errors.note} />
          <div className="mt-1 flex gap-2.5">
            <button type="button" disabled={saving} className={`${BTN_GREEN} !h-11 flex-1`} onClick={save}>
              {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm nhà cung cấp"}
            </button>
            <button type="button" disabled={saving} className={`${BTN_GHOST} !h-11`} onClick={() => setForm(null)}>
              Hủy
            </button>
          </div>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Xác nhận xóa"
          danger
          busy={deleting}
          confirmLabel="Xóa"
          text={<>Xóa nhà cung cấp “{toDelete.name}”? Không thể hoàn tác. Nhà cung cấp đã có lời mời báo giá sẽ không xóa được.</>}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
