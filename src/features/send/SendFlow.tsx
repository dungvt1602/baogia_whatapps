"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { sx, HButton } from "@/components/common/ui";

// ---- kiểu dữ liệu trả về từ API (BigInt -> string) ----
type Quotation = { id: string; code: string; title: string | null; status: string; market: string | null; totalAmount: unknown; currency: string; _count: { templates: number } };
type Template = { id: string; name: string; icon: string | null; body: string | null; waTemplateName: string | null; channel: { id: string; name: string; type: string } | null; _count: { customers: number } };
type Recipient = { id: string; name: string; phone: string };
type PItem = { no: number; product: string; packing: string | null; unit: string | null; quantity: unknown; price: unknown };
type Preview = {
  batch: { id: string; code: string; quotationId: string; recipientCount: number; status: string };
  channel: { name: string; type: string } | null;
  template: { id: string; name: string };
  quotation: { code: string; title: string | null; market: string | null; currency: string; totalAmount: unknown; validUntil: string | null };
  items: PItem[];
  sample: string;
  recipients: Recipient[];
};
type Job = { id: string; toName: string | null; toPhone: string | null; channel: string; status: string; messageId: string | null; error: string | null; retryCount: number };
type Batch = { id: string; code: string; status: string; note: string | null; recipientCount: number; quotation: { code: string; title: string | null }; template: { name: string }; channel: { name: string; type: string } | null; jobs: Job[] };

const TERMINAL = ["SENT", "PARTIAL_FAILED", "CANCELLED"];
const jobColor: Record<string, string> = { QUEUED: "#B07208", SENDING: "#2F6FD6", SENT: "#1F7440", FAILED: "#B3261E" };

const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px";
const green = "border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:14px; font-weight:600; cursor:pointer; padding:0 18px; height:44px";
const ghost = "border:1px solid #DCE3DC; border-radius:11px; background:#fff; color:#4A5A4E; font-size:14px; font-weight:600; cursor:pointer; padding:0 16px; height:44px";
const num = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
const money = (v: unknown, cur = "VND") => `${num(v).toLocaleString("vi-VN")} ${cur}`;
const fmtDate = (s: string | null) => (s ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s)) : "—");

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}`);
  return data as T;
}
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}`);
  return data as T;
}

const STEPS = ["Chọn báo giá", "Chọn template", "Danh sách gửi", "Điền ảnh & gửi"];
function Stepper({ step, maxStep, onGo }: { step: number; maxStep: number; onGo: (n: number) => void }) {
  return (
    <div style={sx("display:flex; align-items:center; gap:6px; margin-bottom:16px; flex-wrap:wrap")}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step, active = n === step;
        const canGo = n <= maxStep && n !== step;
        const bg = done ? "#1F7440" : active ? "#EAF3EC" : "#F1F4F1";
        const fg = done ? "#fff" : active ? "#1F7440" : "#9AA7A0";
        return (
          <div key={label} style={sx("display:flex; align-items:center; gap:6px")}>
            <div onClick={() => canGo && onGo(n)} title={canGo ? "Sang bước này" : undefined}
              style={sx(`display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:20px; background:${active ? "#EAF3EC" : "transparent"}; cursor:${canGo ? "pointer" : "default"}`)}>
              <span style={sx(`width:24px; height:24px; border-radius:50%; background:${bg}; color:${fg}; display:flex; align-items:center; justify-content:center; font-size:12.5px; font-weight:700`)}>{done ? "✓" : n}</span>
              <span style={sx(`font-size:13px; font-weight:600; color:${active ? "#14261A" : canGo ? "#2F8F4E" : "#8B9A90"}; ${canGo ? "text-decoration:underline; text-underline-offset:2px" : ""}`)}>{label}</span>
            </div>
            {n < STEPS.length && <span style={sx("color:#CBD6CD; font-size:14px")}>›</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function SendFlow({ actorName }: { actorName?: string }) {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [qErr, setQErr] = useState("");
  const [loadingQ, setLoadingQ] = useState(true);

  const [selQ, setSelQ] = useState<Quotation | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingT, setLoadingT] = useState(false);
  const [selTpl, setSelTpl] = useState<Template | null>(null);

  const [imgKey, setImgKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [hasImage, setHasImage] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [batchId, setBatchId] = useState<string>("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getJSON<Quotation[]>("/api/quotations").then(setQuotations).catch((e) => setQErr(e.message)).finally(() => setLoadingQ(false));
  }, []);

  // Bước 1 -> 2
  const pickQuotation = useCallback(async (q: Quotation) => {
    setSelQ(q); setSelTpl(null); setTemplates([]); setPreview(null); setErr(""); setLoadingT(true); setStep(2); setMaxStep(2);
    try { setTemplates(await getJSON<Template[]>(`/api/quotations/${q.id}/templates`)); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoadingT(false); }
  }, []);

  // Bước 2 -> 3: chọn template + tạo preview (lọc khách, dựng bảng, danh sách gửi)
  const pickTemplate = useCallback(async (t: Template) => {
    setSelTpl(t); setErr(""); setBusy(true);
    try { setPreview(await postJSON<Preview>("/api/send/preview", { templateId: t.id, actor: { name: actorName } })); setStep(3); setMaxStep(3); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }, [actorName]);

  // Bước 3 -> 4: sang bước điền ảnh
  function goImage() { setHasImage(null); setImgKey((k) => k + 1); setStep(4); setMaxStep(4); }

  async function uploadImage(file: File | undefined) {
    if (!file || !selTpl) return;
    if (!file.type.startsWith("image/")) return setErr("File phải là ảnh.");
    if (file.size > 5 * 1024 * 1024) return setErr("Ảnh quá lớn (tối đa 5MB).");
    setErr(""); setUploading(true);
    try {
      const res = await fetch(`/api/templates/${selTpl.id}/image`, { method: "POST", headers: { "content-type": file.type }, body: file });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Lỗi ${res.status}`);
      setHasImage(true); setImgKey((k) => k + 1);
    } catch (e) { setErr((e as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const doConfirm = useCallback(async () => {
    if (!preview) return;
    setBusy(true); setErr("");
    try {
      const r = await postJSON<{ batchId: string }>("/api/send/confirm", { batchId: preview.batch.id, actor: { name: actorName } });
      setPreview(null); setBatchId(String(r.batchId));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }, [preview, actorName]);

  // Poll trạng thái sau khi gửi
  useEffect(() => {
    if (!batchId) return;
    const tick = async () => {
      try {
        const b = await getJSON<Batch>(`/api/send/batches/${batchId}`);
        setBatch(b);
        if (TERMINAL.includes(b.status) && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      } catch { /* giữ nguyên */ }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  }, [batchId]);

  function resetAll() {
    setBatchId(""); setBatch(null); setPreview(null); setSelTpl(null); setSelQ(null); setStep(1); setMaxStep(1); setErr("");
  }

  const errBox = err ? <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div> : null;

  // ================= Đang theo dõi lệnh gửi =================
  if (batchId) {
    const sentCount = batch?.jobs.filter((j) => j.status === "SENT").length ?? 0;
    const failedCount = batch?.jobs.filter((j) => j.status === "FAILED").length ?? 0;
    const done = batch ? TERMINAL.includes(batch.status) : false;
    return (
      <div style={sx("max-width:840px")}>
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:10px")}>
            <div style={sx("font-size:16px; font-weight:700; color:#14261A; flex:1")}>Đang gửi: {batch?.code || batchId}</div>
            <span style={sx(`font-size:12px; font-weight:700; padding:5px 12px; border-radius:20px; background:${done ? "#E7F5EC" : "#FDF3E0"}; color:${done ? "#1F7440" : "#B07208"}`)}>{batch?.status || "..."}</span>
          </div>
          <div style={sx("font-size:13px; color:#7B8A80; margin-top:6px")}>
            {batch ? `${batch.template.name} · ${batch.channel?.name || "kênh mặc định"} · ` : ""}Thành công {sentCount}/{batch?.recipientCount ?? 0}{failedCount ? `, lỗi ${failedCount}` : ""}
          </div>
          {!done && <div style={sx("font-size:12.5px; color:#2F6FD6; margin-top:8px")}>⏳ Worker đang gửi, tự cập nhật mỗi 2s...</div>}
          <div style={sx("margin-top:16px; display:flex; flex-direction:column; gap:8px")}>
            {batch?.jobs.map((j) => (
              <div key={j.id} style={sx("display:flex; align-items:center; gap:12px; padding:11px 13px; border:1px solid #F0F3F0; border-radius:11px")}>
                <div style={sx("min-width:0; flex:1")}>
                  <div style={sx("font-size:14px; font-weight:600; color:#14261A")}>{j.toName}</div>
                  <div style={sx("font-size:12px; color:#8B9A90")}>{j.toPhone} · {j.channel}{j.error ? ` · ${j.error}` : ""}</div>
                </div>
                <span style={sx(`font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:20px; color:${jobColor[j.status] || "#4A5A4E"}; background:#F5F8F5`)}>{j.status}</span>
              </div>
            ))}
          </div>
          <HButton s={`${green} margin-top:18px`} onClick={resetAll}>← Gửi lệnh khác</HButton>
        </div>
      </div>
    );
  }

  // ================= Wizard 4 bước =================
  return (
    <div style={sx("max-width:760px")}>
      <Stepper step={step} maxStep={maxStep} onGo={setStep} />
      {errBox}

      {/* Bước 1: chọn báo giá */}
      {step === 1 && (
        <div style={sx(card)}>
          <div style={sx("font-size:15px; font-weight:700; color:#14261A; margin-bottom:12px")}>Chọn báo giá cần gửi</div>
          {loadingQ && <div style={sx("font-size:13px; color:#8B9A90")}>Đang tải...</div>}
          {qErr && <div style={sx("font-size:13px; color:#B3261E")}>Lỗi: {qErr}</div>}
          {!loadingQ && !qErr && quotations.length === 0 && <div style={sx("font-size:13px; color:#8B9A90")}>Chưa có báo giá nào.</div>}
          <div style={sx("display:flex; flex-direction:column; gap:8px")}>
            {quotations.map((q) => (
              <div key={q.id} onClick={() => pickQuotation(q)} style={sx("display:flex; align-items:center; gap:12px; border:1px solid #E9EEE9; border-radius:12px; padding:13px; cursor:pointer")}>
                <div style={sx("width:40px; height:40px; border-radius:11px; background:#EAF3EC; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0")}>📄</div>
                <div style={sx("min-width:0; flex:1")}>
                  <div style={sx("font-size:14.5px; font-weight:600; color:#14261A")}>{q.code}</div>
                  <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.title || "—"} · {q._count.templates} template</div>
                </div>
                <div style={sx("text-align:right; flex-shrink:0")}>
                  <div style={sx("font-size:13.5px; font-weight:700; color:#14261A")}>{money(q.totalAmount, q.currency)}</div>
                  <div style={sx("font-size:11.5px; color:#7B8A80")}>{q.market || q.status}</div>
                </div>
                <span style={sx("color:#B9C5BC; font-size:18px")}>›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bước 2: chọn template */}
      {step === 2 && (
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Chọn template trong {selQ?.code}</div>
            <HButton s={ghost} onClick={() => setStep(1)}>‹ Đổi báo giá</HButton>
          </div>
          {loadingT && <div style={sx("font-size:13px; color:#8B9A90")}>Đang tải template...</div>}
          {busy && <div style={sx("font-size:13px; color:#2F6FD6")}>Đang lấy danh sách gửi...</div>}
          {!loadingT && templates.length === 0 && <div style={sx("font-size:13px; color:#8B9A90")}>Báo giá này chưa có template. Vào menu Báo giá để gắn template.</div>}
          <div style={sx("display:flex; flex-direction:column; gap:8px")}>
            {templates.map((t) => (
              <div key={t.id} onClick={() => !busy && pickTemplate(t)} style={sx("display:flex; align-items:center; gap:12px; padding:13px; border:1px solid #E9EEE9; border-radius:12px; cursor:pointer")}>
                <div style={sx("width:38px; height:38px; border-radius:11px; background:#F1F5F1; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0")}>{t.icon || "📄"}</div>
                <div style={sx("min-width:0; flex:1")}>
                  <div style={sx("font-size:14px; font-weight:600; color:#14261A")}>{t.name}</div>
                  <div style={sx("font-size:12px; color:#8B9A90")}>{t._count.customers} khách · {t.channel ? t.channel.type : "chưa gắn kênh"}{t.waTemplateName ? ` · ${t.waTemplateName}` : ""}</div>
                </div>
                <span style={sx("color:#B9C5BC; font-size:18px")}>›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bước 3: danh sách gửi (xem trước) */}
      {step === 3 && preview && (
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Danh sách gửi</div>
            <HButton s={ghost} onClick={() => { setPreview(null); setStep(2); }}>‹ Đổi template</HButton>
          </div>

          {/* Đầu mục */}
          <div style={sx("background:linear-gradient(135deg,#1F7440,#123E24); color:#fff; border-radius:14px; padding:15px 16px")}>
            <div style={sx("font-size:14px; font-weight:700; letter-spacing:.02em")}>📋 BÁO GIÁ {preview.quotation.market || preview.quotation.code}</div>
            <div style={sx("display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; margin-top:10px; font-size:12.5px; color:#CDE8D5")}>
              <div>Mã lệnh: <b style={sx("color:#fff")}>{preview.batch.code}</b></div>
              <div>Số khách nhận: <b style={sx("color:#fff")}>{preview.recipients.length}</b></div>
              <div>Template: <b style={sx("color:#fff")}>{preview.template.name}</b></div>
              <div>Kênh: <b style={sx("color:#fff")}>{preview.channel?.name || "mặc định"}</b></div>
              <div>Hiệu lực đến: <b style={sx("color:#fff")}>{fmtDate(preview.quotation.validUntil)}</b></div>
              <div>Tổng: <b style={sx("color:#fff")}>{money(preview.quotation.totalAmount, preview.quotation.currency)}</b></div>
            </div>
          </div>

          {/* Bảng sản phẩm */}
          <div style={sx("font-size:13px; font-weight:600; color:#3C4A40; margin-top:16px; margin-bottom:6px")}>Bảng sản phẩm ({preview.items.length})</div>
          <div style={sx("border:1px solid #E9EEE9; border-radius:12px; overflow:auto")}>
            <table style={sx("width:100%; border-collapse:collapse; font-size:12.5px; min-width:460px")}>
              <thead>
                <tr style={sx("background:#EAF3EC; color:#1F7440")}>
                  <th style={sx("text-align:center; padding:7px 8px; font-weight:700; width:34px")}>#</th>
                  <th style={sx("text-align:left; padding:7px 8px; font-weight:700")}>Mặt hàng</th>
                  <th style={sx("text-align:center; padding:7px 8px; font-weight:700")}>ĐVT</th>
                  <th style={sx("text-align:right; padding:7px 8px; font-weight:700")}>SL</th>
                  <th style={sx("text-align:right; padding:7px 8px; font-weight:700")}>Đơn giá</th>
                  <th style={sx("text-align:right; padding:7px 8px; font-weight:700")}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((it, i) => (
                  <tr key={i} style={sx(`border-top:1px solid #EEF2EE; background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                    <td style={sx("text-align:center; padding:6px 8px; color:#8B9A90")}>{it.no}</td>
                    <td style={sx("padding:6px 8px; color:#14261A")}>{it.product}{it.packing ? <span style={sx("color:#8B9A90")}> · {it.packing}</span> : null}</td>
                    <td style={sx("text-align:center; padding:6px 8px; color:#4A5A4E")}>{it.unit || "—"}</td>
                    <td style={sx("text-align:right; padding:6px 8px; color:#4A5A4E")}>{num(it.quantity).toLocaleString("vi-VN")}</td>
                    <td style={sx("text-align:right; padding:6px 8px; color:#4A5A4E")}>{num(it.price).toLocaleString("vi-VN")}</td>
                    <td style={sx("text-align:right; padding:6px 8px; font-weight:600; color:#14261A")}>{(num(it.quantity) * num(it.price)).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
                <tr style={sx("border-top:2px solid #DCE7DE; background:#F6F9F6")}>
                  <td colSpan={5} style={sx("text-align:right; padding:8px; font-weight:700; color:#3C4A40")}>Tổng cộng</td>
                  <td style={sx("text-align:right; padding:8px; font-weight:700; color:#1F7440")}>{money(preview.quotation.totalAmount, preview.quotation.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Danh sách khách nhận */}
          <div style={sx("font-size:13px; font-weight:600; color:#3C4A40; margin-top:16px; margin-bottom:6px")}>Khách nhận ({preview.recipients.length})</div>
          <div style={sx("display:flex; flex-direction:column; gap:6px; max-height:220px; overflow:auto")}>
            {preview.recipients.map((r) => (
              <div key={r.id} style={sx("display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid #F0F3F0; border-radius:10px")}>
                <span style={sx("width:30px; height:30px; border-radius:50%; background:#EAF3EC; color:#1F7440; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0")}>{r.name.trim().split(/\s+/).slice(-2).map((x) => x[0]).join("").toUpperCase()}</span>
                <span style={sx("font-size:13.5px; font-weight:600; color:#14261A; flex:1")}>{r.name}</span>
                <span style={sx("font-size:12.5px; color:#8B9A90")}>{r.phone || "(thiếu SĐT)"}</span>
              </div>
            ))}
          </div>

          <div style={sx("display:flex; gap:10px; margin-top:20px")}>
            <HButton s={`${green} flex:1`} onClick={goImage}>Tiếp tục → điền ảnh</HButton>
          </div>
        </div>
      )}

      {/* Bước 4: điền ảnh & gửi */}
      {step === 4 && selTpl && preview && (
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:6px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Ảnh gửi kèm — {selTpl.name}</div>
            <HButton s={ghost} onClick={() => setStep(3)}>‹ Xem lại danh sách</HButton>
          </div>
          <div style={sx("font-size:12.5px; color:#8B9A90; margin-bottom:14px")}>Ảnh này gửi vào <b>header</b> của template WhatsApp (giống bot). Có thể bỏ qua nếu template gửi text.</div>
          <input ref={fileRef} type="file" accept="image/*" style={sx("display:none")} onChange={(e) => uploadImage(e.target.files?.[0])} />
          {hasImage !== false ? (
            <>
              <img src={`/api/templates/${selTpl.id}/image?t=${imgKey}`} alt="Ảnh header" onLoad={() => setHasImage(true)} onError={() => setHasImage(false)}
                style={sx(`width:100%; max-height:320px; object-fit:contain; border:1px solid #E9EEE9; border-radius:12px; display:${hasImage ? "block" : "none"}; background:#FAFCFA`)} />
              {hasImage === null && <div style={sx("font-size:13px; color:#8B9A90; padding:20px; text-align:center")}>Đang kiểm tra ảnh...</div>}
              {hasImage && <HButton s={`${ghost} margin-top:12px; width:100%`} onClick={() => fileRef.current?.click()}>{uploading ? "Đang tải..." : "Thay ảnh khác"}</HButton>}
            </>
          ) : (
            <div onClick={() => fileRef.current?.click()} style={sx("border:2px dashed #D5DED6; border-radius:13px; padding:30px 15px; text-align:center; cursor:pointer; background:#FAFCFA")}>
              <div style={sx("font-size:32px; margin-bottom:6px")}>🖼️</div>
              <div style={sx("font-size:14px; font-weight:600; color:#3C4A40")}>{uploading ? "Đang tải..." : "Bấm để tải ảnh báo giá lên"}</div>
              <div style={sx("font-size:12px; color:#8B9A90; margin-top:3px")}>PNG/JPG, tối đa 5MB</div>
            </div>
          )}

          <div style={sx("display:flex; gap:10px; margin-top:20px")}>
            <HButton s={`${green} flex:1; height:48px; opacity:${busy || uploading ? ".6" : "1"}`} onClick={doConfirm}>{busy ? "Đang gửi..." : `Gửi cho ${preview.recipients.length} khách`}</HButton>
          </div>
        </div>
      )}
    </div>
  );
}
