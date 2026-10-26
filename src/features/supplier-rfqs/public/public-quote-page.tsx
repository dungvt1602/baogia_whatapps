"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getJSON, postJSON } from "@/lib/api";
import type { PublicRfq } from "@/features/supplier-rfqs/types";
import { formatDateTime, formatDecimal, parseDecimalInput } from "@/features/supplier-rfqs/utils/format";
import {
  initQuoteForm,
  validateQuote,
  type QuoteFormState,
  type QuoteValidation,
  type RowErrors,
} from "@/features/supplier-rfqs/public/quote-form";

/*
 * Trang công khai NCC nhập giá (mở từ nút trong tin Zalo, thường trong webview Zalo).
 * Chủ ý:
 *  - Không dùng localStorage/cookie/đăng nhập; token trong URL là định danh duy nhất.
 *  - Mobile-first (390px): ô nhập cao 48px, chữ 16px (iOS không tự zoom), nút nộp rộng toàn dòng.
 *  - Phân biệt lỗi theo HTTP status: 404 = link sai/hết hạn, 429 = quá nhanh, còn lại hiện thông báo BE.
 */
type LoadState =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: PublicRfq };

const INPUT =
  "h-12 w-full rounded-xl border-[1.5px] border-[#DFE6E0] bg-white px-3 text-[16px] text-[#14261A] outline-none focus:border-[#3EA85C] focus:shadow-[0_0_0_3px_rgba(62,168,92,.14)] disabled:bg-[#F4F6F3] disabled:text-[#4A5A4E]";
const LABEL = "mb-1 block text-[12.5px] font-semibold text-[#3C4A40]";
const NETWORK_MSG = "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";

export function describeLoadError(e: unknown): LoadState {
  if (e instanceof ApiError && e.status === 404) {
    return { kind: "invalid", message: e.message || "Link không hợp lệ hoặc đã hết hạn." };
  }
  if (e instanceof ApiError) return { kind: "error", message: e.message };
  return { kind: "error", message: NETWORK_MSG };
}

export function describeSubmitError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 413) return "Dữ liệu gửi lên quá lớn. Vui lòng rút gọn ghi chú rồi thử lại.";
    if (e.status === 429) return e.message || "Thao tác quá nhanh, thử lại sau.";
    return e.message;
  }
  return NETWORK_MSG;
}

export default function PublicQuotePage({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const data = await getJSON<PublicRfq>(`/api/public/supplier-rfq/${encodeURIComponent(token)}`);
      setState({ kind: "ready", data });
    } catch (e) {
      setState(describeLoadError(e));
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pb-28 pt-5">
      <div className="mb-4 flex items-center gap-2 text-[13px] font-bold tracking-wide text-[#1F7440]">
        <span className="inline-block h-5 w-1 rounded bg-gradient-to-b from-[#3EA85C] to-[#1F7440]" />
        AGO GROUP · YÊU CẦU BÁO GIÁ
      </div>

      {state.kind === "loading" && (
        <div role="status" className="rounded-2xl bg-white p-6 text-center text-[14px] text-[#6B7A70]">
          Đang tải yêu cầu báo giá...
        </div>
      )}

      {state.kind === "invalid" && (
        <div role="alert" className="rounded-2xl border border-[#F3C9C6] bg-white p-6 text-center">
          <div className="mb-1 text-[17px] font-bold text-[#B3261E]">Không mở được báo giá</div>
          <div className="text-[14px] leading-relaxed text-[#4A5A4E]">{state.message}</div>
          <div className="mt-2 text-[12.5px] text-[#8B9A90]">Vui lòng liên hệ Ago Group để được gửi lại link mới.</div>
        </div>
      )}

      {state.kind === "error" && (
        <div role="alert" className="rounded-2xl border border-[#F3C9C6] bg-white p-6 text-center">
          <div className="mb-1 text-[17px] font-bold text-[#B3261E]">Có lỗi xảy ra</div>
          <div className="text-[14px] text-[#4A5A4E]">{state.message}</div>
          <button
            type="button"
            className="mt-4 h-12 w-full rounded-xl border-0 bg-gradient-to-br from-[#3EA85C] to-[#1F7440] text-[15px] font-semibold text-white"
            onClick={() => {
              setState({ kind: "loading" });
              void load();
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {state.kind === "ready" && <QuoteView token={token} data={state.data} />}
    </main>
  );
}

// Dòng "hiểu là" dưới ô đơn giá: cho NCC thấy hệ thống đọc số họ gõ thế nào TRƯỚC khi gửi.
function Interpreted({ raw, currency }: { raw: string; currency: string }) {
  const p = parseDecimalInput(raw);
  if (!p.ok) return p.message ? <span className="mt-1 block text-[12.5px] text-[#B3261E]">{p.message}</span> : null;
  if (!p.value) return null;
  return (
    <span className="mt-1 block text-[12.5px] text-[#1F7440]" data-testid="interpreted">
      Đơn giá hiểu là: {formatDecimal(p.value)} {currency}
    </span>
  );
}

function QuoteView({ token, data }: { token: string; data: PublicRfq }) {
  const readOnly = !data.canSubmit;
  const [form, setForm] = useState<QuoteFormState>(() => initQuoteForm(data));
  const [validation, setValidation] = useState<QuoteValidation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [savedVersion, setSavedVersion] = useState<string | null>(data.quote ? String(data.quote.version) : null);
  const [justSaved, setJustSaved] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  // Cờ đồng bộ chống bấm đúp: state `submitting` chỉ cập nhật sau render nên 2 lần bấm sát nhau vẫn lọt.
  const inFlight = useRef(false);

  const setRow = (i: number, patch: Partial<QuoteFormState["rows"][number]>) =>
    setForm((f) => ({ ...f, rows: f.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));

  async function submit() {
    if (inFlight.current) return;
    setSubmitError("");
    setJustSaved(false);
    const v = validateQuote(form);
    setValidation(v);
    if (!v.ok || !v.payload) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const res = await postJSON<{ ok: boolean; version: number | string }>(
        `/api/public/supplier-rfq/${encodeURIComponent(token)}/quote`,
        v.payload,
      );
      setSavedVersion(String(res.version));
      setJustSaved(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSubmitError(describeSubmitError(e));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const rowErr = (id: string): RowErrors => validation?.rowErrors[id] ?? {};

  return (
    <div className="flex flex-col gap-3">
      {data.isTest && (
        <div className="rounded-xl bg-[#FFF4E0] px-4 py-2.5 text-center text-[13.5px] font-bold text-[#A15C00]">
          Chế độ thử — đây là bản xem thử của nội bộ, giá nhập sẽ không được tính
        </div>
      )}

      {justSaved && (
        <div role="status" className="rounded-xl border border-[#CFE6D5] bg-[#EAF3EC] px-4 py-3 text-[14px] leading-relaxed text-[#1F4A2C]">
          <b>Đã gửi báo giá thành công (phiên bản {savedVersion}).</b>
          <br />
          Bạn có thể mở lại link này để sửa giá{data.rfq.deadline ? ` đến ${formatDateTime(data.rfq.deadline)}` : " đến hết hạn"}.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_6px_24px_-16px_rgba(20,38,26,.35)]">
        {data.rfq.hasImage && data.rfq.imageUrl && imgOk && (
          <img src={data.rfq.imageUrl} alt={data.rfq.title} className="block max-h-[320px] w-full bg-[#F4F6F3] object-contain" onError={() => setImgOk(false)} />
        )}
        <div className="p-4">
          <div className="text-[12px] font-semibold text-[#7B8A80]">{data.rfq.code}</div>
          <h1 className="m-0 mt-0.5 text-[20px] font-bold leading-snug text-[#14261A]">{data.rfq.title}</h1>
          <div className="mt-2 text-[13.5px] text-[#4A5A4E]">
            Gửi đến: <b>{data.supplierName}</b>
          </div>
          <div className="mt-1 text-[13.5px] text-[#4A5A4E]">
            Hạn báo giá: <b>{data.rfq.deadline ? formatDateTime(data.rfq.deadline) : "Không giới hạn"}</b>
          </div>
          {data.rfq.note && <div className="mt-3 whitespace-pre-line rounded-xl bg-[#F7FAF7] p-3 text-[14px] leading-relaxed text-[#33413A]">{data.rfq.note}</div>}
        </div>
      </section>

      {readOnly && (
        <div role="alert" className="rounded-xl border border-[#F3D9A8] bg-[#FFF8EA] px-4 py-3 text-[14px] leading-relaxed text-[#7A4A00]">
          <b>{data.expired ? "Đã quá hạn báo giá." : "Yêu cầu báo giá này đã đóng."}</b> Bạn chỉ có thể xem, không gửi hoặc sửa giá được nữa.
        </div>
      )}

      {data.items.map((it, i) => {
        const row = form.rows[i];
        const e = rowErr(it.id);
        return (
          <section key={it.id} className="rounded-2xl bg-white p-4 shadow-[0_6px_24px_-16px_rgba(20,38,26,.35)]">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#EAF3EC] px-1.5 text-[12px] font-bold text-[#1F7440]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-bold leading-snug text-[#14261A]">{it.product}</div>
                {it.spec && <div className="mt-0.5 text-[13.5px] text-[#4A5A4E]">{it.spec}</div>}
                <div className="mt-1 text-[13.5px] font-semibold text-[#1F7440]">
                  Số lượng: {it.quantity ? formatDecimal(it.quantity) : "—"}
                  {it.unit ? ` ${it.unit}` : ""}
                </div>
                {it.note && <div className="mt-1 text-[12.5px] text-[#7B8A80]">{it.note}</div>}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <label className="min-[420px]:col-span-2">
                <span className={LABEL}>Đơn giá ({form.currency}){readOnly ? "" : " *"}</span>
                <input
                  className={`${INPUT} ${e.unitPrice ? "!border-[#E4746E]" : ""}`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="VD: 25000"
                  disabled={readOnly}
                  value={row.unitPrice}
                  onChange={(ev) => setRow(i, { unitPrice: ev.target.value })}
                />
                {e.unitPrice ? (
                  <span className="mt-1 block text-[12.5px] text-[#B3261E]">{e.unitPrice}</span>
                ) : (
                  <Interpreted raw={row.unitPrice} currency={form.currency} />
                )}
              </label>
              <label>
                <span className={LABEL}>MOQ (số lượng tối thiểu)</span>
                <input
                  className={`${INPUT} ${e.moq ? "!border-[#E4746E]" : ""}`}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={readOnly}
                  value={row.moq}
                  onChange={(ev) => setRow(i, { moq: ev.target.value })}
                />
                {e.moq && <span className="mt-1 block text-[12.5px] text-[#B3261E]">{e.moq}</span>}
              </label>
              <label>
                <span className={LABEL}>Thời gian giao (ngày)</span>
                <input
                  className={`${INPUT} ${e.leadTimeDays ? "!border-[#E4746E]" : ""}`}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={readOnly}
                  value={row.leadTimeDays}
                  onChange={(ev) => setRow(i, { leadTimeDays: ev.target.value })}
                />
                {e.leadTimeDays && <span className="mt-1 block text-[12.5px] text-[#B3261E]">{e.leadTimeDays}</span>}
              </label>
              <label className="min-[420px]:col-span-2">
                <span className={LABEL}>Ghi chú</span>
                <input className={INPUT} autoComplete="off" disabled={readOnly} value={row.note} onChange={(ev) => setRow(i, { note: ev.target.value })} />
              </label>
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl bg-white p-4 shadow-[0_6px_24px_-16px_rgba(20,38,26,.35)]">
        <div className="mb-3 text-[15px] font-bold text-[#14261A]">Thông tin chung</div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <label>
            <span className={LABEL}>Tiền tệ (cố định theo yêu cầu)</span>
            <input className={`${INPUT} uppercase`} readOnly disabled value={form.currency} aria-label="Tiền tệ" />
          </label>
          <label>
            <span className={LABEL}>Giá có hiệu lực đến</span>
            <input
              type="date"
              className={`${INPUT} ${validation?.validUntilError ? "!border-[#E4746E]" : ""}`}
              disabled={readOnly}
              value={form.validUntil}
              onChange={(ev) => setForm({ ...form, validUntil: ev.target.value })}
            />
            {validation?.validUntilError && <span className="mt-1 block text-[12.5px] text-[#B3261E]">{validation.validUntilError}</span>}
          </label>
          <label className="min-[420px]:col-span-2">
            <span className={LABEL}>Ghi chú chung</span>
            <textarea
              rows={3}
              disabled={readOnly}
              value={form.note}
              onChange={(ev) => setForm({ ...form, note: ev.target.value })}
              className="w-full rounded-xl border-[1.5px] border-[#DFE6E0] bg-white p-3 text-[16px] text-[#14261A] outline-none focus:border-[#3EA85C] disabled:bg-[#F4F6F3]"
            />
          </label>
        </div>
      </section>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 border-t border-[#E6EBE6] bg-[rgba(244,246,243,.95)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          {validation?.formError && (
            <div role="alert" className="mb-2 text-[13.5px] font-semibold text-[#B3261E]">
              {validation.formError}
            </div>
          )}
          {submitError && (
            <div role="alert" className="mb-2 rounded-lg bg-[#FDECEC] px-3 py-2 text-[13.5px] text-[#B3261E]">
              {submitError}
            </div>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="h-[52px] w-full cursor-pointer rounded-xl border-0 bg-gradient-to-br from-[#3EA85C] to-[#1F7440] text-[16px] font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Đang gửi..." : savedVersion ? "Cập nhật báo giá" : "Gửi báo giá"}
          </button>
        </div>
      )}
    </div>
  );
}
