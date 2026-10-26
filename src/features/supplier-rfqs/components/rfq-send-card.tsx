"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getJSON, postJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Badge, MissingZaloBadge } from "@/components/shared/badge";
import { BTN_GHOST, BTN_GREEN, ConfirmDialog } from "@/components/shared/modal";
import { invitationStatusMeta } from "@/features/supplier-rfqs/utils/status";
import { resultKind, summarizeResults } from "@/features/supplier-rfqs/utils/send-results";
import type { RfqInvitation, RfqSupplierOption, SendResponse, SendResult } from "@/features/supplier-rfqs/types";

/*
 * Chọn nhà cung cấp rồi "Gửi qua Zalo".
 * NCC chưa có Zalo user_id bị khoá (không có đích để gửi). NCC đã được mời trước đó vẫn chọn được,
 * khi đó cần tick "Gửi lại" để BE chấp nhận gửi lần nữa. Kết quả từng NCC (kể cả lỗi của Zalo)
 * hiện nguyên văn bên dưới để người dùng biết NCC nào không nhận được.
 */
export default function RfqSendCard({
  rfqId,
  invitations,
  canSend,
  blockedReason,
  onSent,
}: {
  rfqId: string;
  invitations: RfqInvitation[];
  canSend: boolean;
  blockedReason?: string;
  onSent: () => void;
}) {
  const [suppliers, setSuppliers] = useState<RfqSupplierOption[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [resend, setResend] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getJSON<RfqSupplierOption[]>("/api/suppliers");
        if (alive) setSuppliers(list);
      } catch (e) {
        if (alive) {
          setSuppliers([]);
          setLoadErr(apiErrorMessage(e, "Không tải được danh sách nhà cung cấp"));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Lời mời THẬT gần nhất của từng NCC (bỏ qua lời mời thử).
  const inviteBySupplier = useMemo(() => {
    const m = new Map<string, RfqInvitation>();
    for (const inv of invitations) if (!inv.isTest && inv.supplierId) m.set(inv.supplierId, inv);
    return m;
  }, [invitations]);

  const sendable = (suppliers ?? []).filter((s) => !!s.zaloUserId);
  const pickedList = (suppliers ?? []).filter((s) => picked.has(s.id));
  const anyInvited = pickedList.some((s) => inviteBySupplier.has(s.id));
  // "Gửi lại" chỉ có nghĩa khi trong số được chọn có NCC đã mời; không bao giờ gửi resend=true nếu không
  // (tránh vô hiệu hoá lớp chống gửi trùng của BE).
  const resendOn = resend && anyInvited;

  // Đổi lựa chọn; nếu không còn NCC đã mời nào thì bỏ tick "Gửi lại" luôn (không để trạng thái cũ ẩn đi rồi quay lại).
  function updatePicked(next: Set<string>) {
    setPicked(next);
    if (![...next].some((id) => inviteBySupplier.has(id))) setResend(false);
  }
  function toggle(id: string) {
    const n = new Set(picked);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    updatePicked(n);
  }

  async function doSend() {
    setSending(true);
    try {
      const res = await postJSON<SendResponse>(`/api/supplier-rfqs/${rfqId}/send`, {
        supplierIds: pickedList.map((s) => s.id),
        ...(resendOn ? { resend: true } : {}),
      });
      setResults(res.results);
      const { sent, skipped, failed } = summarizeResults(res.results);
      const skipTxt = skipped ? `, bỏ qua ${skipped} (đã gửi trước đó)` : "";
      if (failed === 0 && skipped === 0) toast.success(`Đã gửi cho ${sent} nhà cung cấp`);
      else if (failed === 0) toast.info(`Đã gửi ${sent}${skipTxt}`);
      else toast.warning(`Đã gửi ${sent}, lỗi ${failed}${skipTxt} — xem chi tiết bên dưới`);
      updatePicked(new Set());
      setConfirming(false);
      onSent();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Không gửi được"));
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="text-[13px] font-bold text-[#14261A]">Gửi cho nhà cung cấp qua Zalo</div>
        <div className="flex-1" />
        <button type="button" className={BTN_GHOST} disabled={!canSend || sendable.length === 0} onClick={() => updatePicked(new Set(sendable.map((s) => s.id)))}>
          Chọn tất cả có Zalo
        </button>
        {picked.size > 0 && (
          <button type="button" className={BTN_GHOST} onClick={() => updatePicked(new Set())}>
            Bỏ chọn
          </button>
        )}
      </div>

      {!canSend && blockedReason && <div className="mb-2 rounded-lg bg-[#FFF8EA] px-3 py-2 text-[12.5px] text-[#7A4A00]">{blockedReason}</div>}
      {loadErr && <div className="mb-2 text-[12.5px] text-[#B3261E]">{loadErr}</div>}

      <div className="max-h-[320px] overflow-auto rounded-[10px] border border-[#D3DCE3] bg-white">
        {suppliers == null && <div className="p-4 text-center text-[13px] text-[#8B9A90]">Đang tải...</div>}
        {suppliers != null && suppliers.length === 0 && <div className="p-4 text-center text-[13px] text-[#8B9A90]">Chưa có nhà cung cấp. Thêm ở menu “Nhà cung cấp”.</div>}
        {(suppliers ?? []).map((s) => {
          const noZalo = !s.zaloUserId;
          const inv = inviteBySupplier.get(s.id);
          const m = inv ? invitationStatusMeta(inv.status) : null;
          return (
            <label
              key={s.id}
              className={`flex items-center gap-3 border-b border-[#EFF3EF] px-3 py-2.5 last:border-b-0 ${noZalo || !canSend ? "cursor-not-allowed bg-[#FAFBFA] opacity-70" : "cursor-pointer hover:bg-[#F3FAF5]"}`}
              title={noZalo ? "Chưa có Zalo user_id — thêm ở menu Nhà cung cấp để gửi được" : undefined}
            >
              <input type="checkbox" className="h-[18px] w-[18px]" disabled={noZalo || !canSend} checked={picked.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Chọn ${s.name}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-[#14261A]">{s.name}</div>
                <div className="truncate text-[12px] text-[#7B8A80]">{s.company || (noZalo ? "Chưa có Zalo user_id" : `Zalo: ${s.zaloUserId}`)}</div>
              </div>
              {noZalo && <MissingZaloBadge />}
              {m && <Badge tone={m.tone}>{m.label}</Badge>}
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {anyInvited && (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#3C4A40]">
            <input type="checkbox" checked={resend} onChange={(e) => setResend(e.target.checked)} />
            Gửi lại cho NCC đã nhận lời mời trước đó (link cũ sẽ không dùng được nữa)
          </label>
        )}
        <div className="flex-1" />
        <button type="button" className={`${BTN_GREEN} !h-10`} disabled={!canSend || picked.size === 0 || sending} onClick={() => setConfirming(true)}>
          Gửi qua Zalo{picked.size ? ` (${picked.size})` : ""}
        </button>
      </div>

      {results && (
        <div className="mt-3 rounded-[10px] border border-[#E4EAEF] bg-white p-3" data-testid="send-results">
          <div className="mb-1.5 text-[12.5px] font-bold text-[#14261A]">Kết quả lần gửi vừa rồi</div>
          <ul className="m-0 list-none space-y-1 p-0">
            {results.map((r) => {
              const k = resultKind(r);
              const color = k === "sent" ? "text-[#1F7440]" : k === "skipped" ? "text-[#A15C00]" : "text-[#B3261E]";
              const text = k === "sent" ? "đã gửi" : k === "skipped" ? `bỏ qua — ${r.error}` : r.error || "gửi lỗi";
              return (
                <li key={r.supplierId} className={`text-[13px] ${color}`}>
                  {k === "sent" ? "✓" : k === "skipped" ? "ℹ" : "✕"} <b>{r.supplierName}</b> — {text}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Gửi yêu cầu báo giá"
          confirmLabel={`Gửi cho ${pickedList.length} NCC`}
          busy={sending}
          text={
            <>
              Gửi yêu cầu báo giá qua Zalo cho <b>{pickedList.length}</b> nhà cung cấp:
              <div className="mt-1.5 max-h-[140px] overflow-auto rounded-lg bg-[#F7FAF7] p-2 text-[13px]">{pickedList.map((s) => s.name).join(", ")}</div>
              {resendOn && <div className="mt-1.5">Sẽ gửi lại cho cả NCC đã nhận trước đó — link cũ của họ sẽ không dùng được nữa.</div>}
              <div className="mt-1.5">Tin được gửi thật, không thu hồi được.</div>
            </>
          }
          onConfirm={doSend}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
