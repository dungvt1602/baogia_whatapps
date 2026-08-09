"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { sx, HButton } from "@/components/common/ui";

// ---- kiểu dữ liệu trả về từ API (BigInt -> string) ----
type Quotation = { id: string; code: string; title: string | null; status: string; market: string | null; _count: { templates: number } };
type Template = { id: string; name: string; icon: string | null; body: string | null; channel: { id: string; name: string; type: string } | null; _count: { customers: number } };
type Recipient = { id: string; name: string; phone: string };
type Preview = { batch: { id: string; code: string; quotationId: string; recipientCount: number; status: string }; channel: { name: string; type: string } | null; template: { id: string; name: string }; sample: string; recipients: Recipient[] };
type Job = { id: string; toName: string | null; toPhone: string | null; channel: string; status: string; messageId: string | null; error: string | null; retryCount: number };
type Batch = { id: string; code: string; status: string; note: string | null; recipientCount: number; quotation: { code: string; title: string | null }; template: { name: string }; channel: { name: string; type: string } | null; jobs: Job[] };

const TERMINAL = ["SENT", "PARTIAL_FAILED", "CANCELLED"];

const jobColor: Record<string, string> = {
  QUEUED: "#B07208",
  SENDING: "#2F6FD6",
  SENT: "#1F7440",
  FAILED: "#B3261E",
};

const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px";

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

export default function SendFlow({ actorName }: { actorName?: string }) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [qErr, setQErr] = useState("");
  const [loadingQ, setLoadingQ] = useState(true);

  const [selQ, setSelQ] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingT, setLoadingT] = useState(false);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [batchId, setBatchId] = useState<string>("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tải danh sách báo giá
  useEffect(() => {
    getJSON<Quotation[]>("/api/quotations")
      .then((qs) => setQuotations(qs))
      .catch((e) => setQErr(e.message))
      .finally(() => setLoadingQ(false));
  }, []);

  const pickQuotation = useCallback(async (id: string) => {
    setSelQ(id);
    setTemplates([]);
    setLoadingT(true);
    setErr("");
    try {
      setTemplates(await getJSON<Template[]>(`/api/quotations/${id}/templates`));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingT(false);
    }
  }, []);

  const doPreview = useCallback(async (templateId: string) => {
    setBusy(true);
    setErr("");
    try {
      setPreview(await postJSON<Preview>("/api/send/preview", { templateId, actor: { name: actorName } }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [actorName]);

  const doConfirm = useCallback(async () => {
    if (!preview) return;
    setBusy(true);
    setErr("");
    try {
      const r = await postJSON<{ batchId: string }>("/api/send/confirm", { batchId: preview.batch.id, actor: { name: actorName } });
      setPreview(null);
      setBatchId(String(r.batchId));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [preview, actorName]);

  // Poll trạng thái batch sau khi confirm
  useEffect(() => {
    if (!batchId) return;
    const tick = async () => {
      try {
        const b = await getJSON<Batch>(`/api/send/batches/${batchId}`);
        setBatch(b);
        if (TERMINAL.includes(b.status) && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        /* giữ nguyên */
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [batchId]);

  const resetTracking = () => {
    setBatchId("");
    setBatch(null);
    if (selQ) pickQuotation(selQ);
  };

  // ---- Đang theo dõi 1 lệnh gửi ----
  if (batchId) {
    const sentCount = batch?.jobs.filter((j) => j.status === "SENT").length ?? 0;
    const failedCount = batch?.jobs.filter((j) => j.status === "FAILED").length ?? 0;
    const done = batch ? TERMINAL.includes(batch.status) : false;
    return (
      <div style={sx("max-width:820px")}>
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:10px")}>
            <div style={sx("font-size:16px; font-weight:700; color:#14261A; flex:1")}>
              Đang gửi: {batch?.code || batchId}
            </div>
            <span style={sx(`font-size:12px; font-weight:700; padding:5px 12px; border-radius:20px; background:${done ? "#E7F5EC" : "#FDF3E0"}; color:${done ? "#1F7440" : "#B07208"}`)}>
              {batch?.status || "..."}
            </span>
          </div>
          <div style={sx("font-size:13px; color:#7B8A80; margin-top:6px")}>
            {batch ? `${batch.template.name} · ${batch.channel?.name || "kênh mặc định"} · ` : ""}
            Thành công {sentCount}/{batch?.recipientCount ?? 0}{failedCount ? `, lỗi ${failedCount}` : ""}
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

          <HButton s="margin-top:18px; height:42px; padding:0 20px; border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:14px; font-weight:600; cursor:pointer" onClick={resetTracking}>
            ← Gửi lệnh khác
          </HButton>
        </div>
      </div>
    );
  }

  // ---- Chọn báo giá + template ----
  return (
    <div style={sx("display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); gap:14px; align-items:start")}>
      {/* Cột báo giá */}
      <div style={sx(card)}>
        <div style={sx("font-size:15px; font-weight:700; color:#14261A; margin-bottom:12px")}>1. Chọn báo giá</div>
        {loadingQ && <div style={sx("font-size:13px; color:#8B9A90")}>Đang tải...</div>}
        {qErr && <div style={sx("font-size:13px; color:#B3261E; line-height:1.5")}>Lỗi: {qErr}<br />Kiểm tra DATABASE_URL đã cấu hình chưa.</div>}
        {!loadingQ && !qErr && quotations.length === 0 && <div style={sx("font-size:13px; color:#8B9A90")}>Chưa có báo giá nào. Chạy seed hoặc tạo báo giá.</div>}
        <div style={sx("display:flex; flex-direction:column; gap:6px")}>
          {quotations.map((q) => {
            const on = q.id === selQ;
            return (
              <HButton key={q.id} onClick={() => pickQuotation(q.id)}
                s={`display:block; width:100%; text-align:left; border:1px solid ${on ? "#3EA85C" : "#E9EEE9"}; border-radius:11px; padding:11px 13px; cursor:pointer; background:${on ? "#F0F7F1" : "#fff"}`}
                h={on ? "" : "background:#F7FAF7"}>
                <div style={sx("font-size:14px; font-weight:600; color:#14261A")}>{q.code}</div>
                <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.title || "—"} · {q._count.templates} template</div>
              </HButton>
            );
          })}
        </div>
      </div>

      {/* Cột template */}
      <div style={sx(card)}>
        <div style={sx("font-size:15px; font-weight:700; color:#14261A; margin-bottom:12px")}>2. Chọn template để gửi</div>
        {!selQ && <div style={sx("font-size:13px; color:#8B9A90")}>Chọn một báo giá ở bên trái.</div>}
        {loadingT && <div style={sx("font-size:13px; color:#8B9A90")}>Đang tải template...</div>}
        {err && <div style={sx("font-size:13px; color:#B3261E; margin-bottom:10px")}>Lỗi: {err}</div>}
        {selQ && !loadingT && templates.length === 0 && <div style={sx("font-size:13px; color:#8B9A90")}>Báo giá này chưa có template.</div>}
        <div style={sx("display:flex; flex-direction:column; gap:10px")}>
          {templates.map((t) => (
            <div key={t.id} style={sx("display:flex; align-items:center; gap:12px; padding:13px; border:1px solid #E9EEE9; border-radius:12px")}>
              <div style={sx("width:38px; height:38px; border-radius:11px; background:#F1F5F1; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0")}>{t.icon || "📄"}</div>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:14px; font-weight:600; color:#14261A")}>{t.name}</div>
                <div style={sx("font-size:12px; color:#8B9A90")}>{t._count.customers} khách · {t.channel ? `${t.channel.type}` : "chưa gắn kênh"}</div>
              </div>
              <HButton s={`height:38px; padding:0 16px; border:none; border-radius:10px; color:#fff; font-size:13px; font-weight:600; cursor:pointer; background:linear-gradient(140deg,#3EA85C,#1F7440); opacity:${busy ? ".6" : "1"}`} onClick={() => doPreview(t.id)}>
                Xem trước & gửi
              </HButton>
            </div>
          ))}
        </div>
      </div>

      {/* Modal preview */}
      {preview && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setPreview(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:560px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5); animation:agoRise .3s ease both")}>
            <div style={sx("display:flex; align-items:center; gap:10px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Xem trước — {preview.template.name}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setPreview(null)}>✕</HButton>
            </div>
            <div style={sx("font-size:13px; color:#7B8A80; margin-top:6px")}>
              Lệnh {preview.batch.code} · {preview.recipients.length} khách · {preview.channel?.name || "kênh mặc định"}
            </div>

            <div style={sx("font-size:13px; font-weight:600; color:#3C4A40; margin-top:16px; margin-bottom:6px")}>Ảnh header (gửi kèm khi dùng WhatsApp template)</div>
            <img src={`/api/templates/${preview.template.id}/image`} alt="Ảnh header" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty("display", "block"); }} style={sx("width:100%; border:1px solid #E9EEE9; border-radius:12px; display:block")} />
            <div style={sx("display:none; font-size:12.5px; color:#8B9A90; background:#F6F9F6; border:1px solid #E9EEE9; border-radius:12px; padding:12px")}>Template chưa có ảnh header — sẽ gửi không kèm ảnh.</div>

            <div style={sx("font-size:13px; font-weight:600; color:#3C4A40; margin-top:16px; margin-bottom:6px")}>Nội dung gửi (mẫu cho khách đầu tiên)</div>
            <div style={sx("background:#F6F9F6; border:1px solid #E9EEE9; border-radius:12px; padding:14px; font-size:13.5px; line-height:1.7; color:#3C4A40; white-space:pre-wrap")}>{preview.sample}</div>

            <div style={sx("font-size:13px; font-weight:600; color:#3C4A40; margin-top:16px; margin-bottom:6px")}>Danh sách khách nhận</div>
            <div style={sx("display:flex; flex-direction:column; gap:6px; max-height:200px; overflow:auto")}>
              {preview.recipients.map((r) => (
                <div key={r.id} style={sx("display:flex; align-items:center; gap:10px; padding:8px 11px; border:1px solid #F0F3F0; border-radius:10px")}>
                  <span style={sx("font-size:13.5px; font-weight:600; color:#14261A; flex:1")}>{r.name}</span>
                  <span style={sx("font-size:12.5px; color:#8B9A90")}>{r.phone || "(thiếu SĐT)"}</span>
                </div>
              ))}
            </div>

            {err && <div style={sx("font-size:13px; color:#B3261E; margin-top:12px")}>Lỗi: {err}</div>}

            <div style={sx("display:flex; gap:10px; margin-top:20px")}>
              <HButton s={`flex:1; height:46px; border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:14.5px; font-weight:600; cursor:pointer; opacity:${busy ? ".6" : "1"}`} onClick={doConfirm}>
                {busy ? "Đang xử lý..." : `Xác nhận gửi ${preview.recipients.length} khách`}
              </HButton>
              <HButton s="height:46px; padding:0 18px; border:1px solid #DCE3DC; border-radius:11px; background:#fff; color:#4A5A4E; font-size:14.5px; font-weight:500; cursor:pointer" h="background:#F7FAF7" onClick={() => setPreview(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
