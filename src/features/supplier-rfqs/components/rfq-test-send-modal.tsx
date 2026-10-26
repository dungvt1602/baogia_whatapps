"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, getJSON, postJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { BTN_GHOST, BTN_GREEN, FIELD_CLS, LABEL_CLS, Modal } from "@/components/shared/modal";
import { ZALO_USER_ID_MSG, ZALO_USER_ID_RE } from "@/features/supplier-rfqs/schemas/rfq-schema";
import type { TestRecipient, TestSendResponse } from "@/features/supplier-rfqs/types";

/*
 * "Nhắn thử": gửi tin RFQ THẬT tới 1 tài khoản Zalo (nhân viên đã liên kết hoặc user_id nhập tay)
 * để chủ hệ thống xem tin hiển thị thế nào và kiểm tra định dạng tin Zalo.
 * Vì vậy kết quả hiện đầy đủ: thành công/thất bại, `mode` đã dùng, link NCC, và phản hồi thô của Zalo
 * (hoặc lỗi) trong hộp monospace — đây là nguồn chẩn đoán khi Zalo từ chối.
 */
export type TestOutcome = { kind: "result"; data: TestSendResponse } | { kind: "error"; message: string };

const MODE_HELP: Record<string, string> = {
  list: "Tin dạng danh sách (có ảnh + nút mở form)",
  text: "Tin văn bản thường kèm link",
};

export function formatRaw(v: unknown): string {
  if (v == null) return "(không có)";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

// Chỉ cho mở link http/https (link do BE trả, nhưng vẫn chặn scheme lạ như javascript:).
export function safeHref(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const u = new URL(link, "http://placeholder.invalid");
    return u.protocol === "http:" || u.protocol === "https:" ? link : null;
  } catch {
    return null;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Đã sao chép link");
  } catch {
    toast.error("Không sao chép được — hãy chọn và copy thủ công");
  }
}

export function TestSendResultView({ outcome }: { outcome: TestOutcome }) {
  const ok = outcome.kind === "result" && outcome.data.ok;
  const data = outcome.kind === "result" ? outcome.data : null;
  // Hộp chẩn đoán: thất bại thì gom cả `error` lẫn phản hồi thô của Zalo (nếu có) để thấy đủ nguyên nhân.
  const raw =
    outcome.kind === "error"
      ? outcome.message
      : data?.ok
        ? formatRaw(data.zalo)
        : [data?.error, data?.zalo != null ? formatRaw(data.zalo) : ""].filter(Boolean).join("\n\n") || "(không có)";
  const href = safeHref(data?.link);

  return (
    <div className={`mt-4 rounded-xl border p-3 ${ok ? "border-[#CFE6D5] bg-[#F3FAF5]" : "border-[#F3C9C6] bg-[#FFF6F5]"}`} data-testid="test-send-result">
      <div className={`text-[14px] font-bold ${ok ? "text-[#1F7440]" : "text-[#B3261E]"}`}>{ok ? "Gửi thử THÀNH CÔNG" : "Gửi thử THẤT BẠI"}</div>
      {outcome.kind === "error" && <div className="mt-1 text-[13px] text-[#B3261E]">{outcome.message}</div>}
      {data && !data.ok && data.error && <div className="mt-1 text-[13px] text-[#B3261E]">{data.error}</div>}
      {data?.listError && (
        <div className="mt-1 text-[13px] text-[#B3261E]">Định dạng list bị Zalo từ chối: {data.listError}</div>
      )}
      {data?.mode && (
        <div className="mt-2 text-[13px] text-[#33413A]">
          Kiểu tin đã dùng (mode): <b>{data.mode}</b>
          {MODE_HELP[data.mode] ? ` — ${MODE_HELP[data.mode]}` : ""}
        </div>
      )}
      {data?.link && (
        <div className="mt-2">
          <div className="text-[12px] font-semibold text-[#3C4A40]">Link form của NCC (bản thử)</div>
          <div className="mt-1 break-all rounded-lg bg-white px-2 py-1.5 font-mono text-[12px] text-[#14261A]">{data.link}</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button type="button" className={BTN_GHOST} onClick={() => void copyText(data.link as string)}>
              Sao chép link
            </button>
            {href && (
              <a href={href} target="_blank" rel="noopener noreferrer" className={`${BTN_GHOST} no-underline`}>
                Mở thử form
              </a>
            )}
          </div>
        </div>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-[12.5px] font-semibold text-[#3C4A40]">{ok ? "Phản hồi thô của Zalo" : "Lỗi / phản hồi thô của Zalo"}</summary>
        <pre className="mt-1.5 max-h-[260px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#14261A] p-2.5 font-mono text-[11.5px] leading-relaxed text-[#D7F0DE]">{raw}</pre>
      </details>
    </div>
  );
}

export default function RfqTestSendModal({ rfqId, onClose }: { rfqId: string; onClose: () => void }) {
  const [recipients, setRecipients] = useState<TestRecipient[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [selected, setSelected] = useState("");
  const [manual, setManual] = useState("");
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getJSON<TestRecipient[]>("/api/supplier-rfqs/test-recipients");
        if (alive) setRecipients(list);
      } catch (e) {
        if (alive) {
          setRecipients([]);
          setLoadErr(apiErrorMessage(e, "Không tải được danh sách nhân viên"));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Ô nhập tay ưu tiên hơn dropdown.
  const zaloUserId = manual.trim() || selected;
  const manualInvalid = manual.trim() !== "" && !ZALO_USER_ID_RE.test(manual.trim());

  async function send() {
    if (!zaloUserId) return;
    setSending(true);
    setOutcome(null);
    try {
      const data = await postJSON<TestSendResponse>(`/api/supplier-rfqs/${rfqId}/test-send`, { zaloUserId });
      setOutcome({ kind: "result", data });
    } catch (e) {
      // Lỗi HTTP 4xx/5xx từ BE vẫn có thể mang `zalo`/`listError`/`mode`/`link` trong body -> giữ lại để chẩn đoán.
      if (e instanceof ApiError && Object.keys(e.body).length > 0) {
        const b = e.body as Partial<TestSendResponse>;
        setOutcome({
          kind: "result",
          data: { ok: false, mode: b.mode, link: b.link, error: e.message, listError: b.listError, zalo: b.zalo },
        });
      } else {
        setOutcome({ kind: "error", message: apiErrorMessage(e, "Không gửi thử được") });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Nhắn thử qua Zalo" onClose={onClose} maxWidth={560} busy={sending}>
      <div className="mb-3 rounded-[10px] border border-[#F3D9A8] bg-[#FFF8EA] px-3 py-2 text-[12.5px] leading-relaxed text-[#7A4A00]">
        Tin sẽ được <b>gửi thật</b> tới tài khoản Zalo bên dưới (qua Zalo OA). Dùng để xem tin hiển thị thế nào; lời mời thử không tính vào danh sách nộp giá.
      </div>

      <label className="mb-3 flex flex-col">
        <span className={LABEL_CLS}>Chọn nhân viên đã liên kết Zalo</span>
        <select className={FIELD_CLS} value={selected} disabled={recipients == null} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{recipients == null ? "Đang tải..." : recipients.length ? "— Chọn nhân viên —" : "Chưa có nhân viên nào liên kết Zalo"}</option>
          {(recipients ?? []).map((r) => (
            <option key={r.userId} value={r.zaloUserId}>
              {r.name} — {r.zaloUserId}
            </option>
          ))}
        </select>
        {loadErr && <span className="mt-1 text-[11.5px] text-[#B3261E]">{loadErr}</span>}
      </label>

      <label className="mb-4 flex flex-col">
        <span className={LABEL_CLS}>Hoặc nhập Zalo user_id</span>
        <input className={FIELD_CLS} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="VD: 2512345678901234567" />
        {manualInvalid ? (
          <span className="mt-1 text-[11.5px] text-[#B3261E]">{ZALO_USER_ID_MSG}</span>
        ) : (
          <span className="mt-1 text-[11.5px] text-[#6B7A70]">Nếu nhập ô này thì dùng ô này thay cho danh sách nhân viên.</span>
        )}
      </label>

      <div className="flex gap-2.5">
        <button type="button" disabled={!zaloUserId || manualInvalid || sending} className={`${BTN_GREEN} !h-11 flex-1`} onClick={send}>
          {sending ? "Đang gửi..." : "Gửi thử"}
        </button>
        <button type="button" disabled={sending} className={`${BTN_GHOST} !h-11`} onClick={onClose}>
          Đóng
        </button>
      </div>

      {outcome && <TestSendResultView outcome={outcome} />}
    </Modal>
  );
}
