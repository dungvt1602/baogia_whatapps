"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, putJSON, patchJSON, sendJSON } from "@/components/common/api";
import { toast } from "sonner";

type Q = {
  id: string;
  code: string;
  title: string | null;
  status: string;
  market: string | null;
  currency: string;
  totalAmount: unknown;
  _count: { templates: number };
};
type Item = { id: string; no: number; product: string; packing: string | null; unit: string | null; quantity: unknown; price: unknown };
type Tpl = { id: string; name: string; icon: string | null; channel: { type: string } | null; _count: { customerLinks: number } };
type QDetail = Q & { validUntil: string | null; issuedDate: string | null; items: Item[]; templates: Tpl[] };

type EditItem = { product: string; packing: string; unit: string; quantity: string; price: string };
type PoolTpl = { id: string; name: string; icon: string | null; channel: { type: string } | null; _count: { customerLinks: number } };

const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px";
const inp = "height:38px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:9px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 14px; height:36px;";
const ghost = "border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const num = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
const money = (v: unknown, cur: string) => `${num(v).toLocaleString("vi-VN")} ${cur}`;
const fmtDate = (s: string | null) => (s ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s)) : "—");

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={sx("background:#F7FAF7; border:1px solid #EEF2EE; border-radius:12px; padding:12px 14px")}>
      <div style={sx("font-size:11.5px; color:#8B9A90; font-weight:600; text-transform:uppercase; letter-spacing:.04em")}>{label}</div>
      <div style={sx("font-size:15px; font-weight:700; color:#14261A; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{value}</div>
      {sub && <div style={sx("font-size:12px; color:#7B8A80; margin-top:2px")}>{sub}</div>}
    </div>
  );
}

const cell = (flex: number, align: "flex-start" | "flex-end" | "center") =>
  `display:flex; flex:${flex}; justify-content:${align}; align-items:center; padding:0 10px`;

export default function QuotesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const m = pathname.match(/^\/bao-gia\/(.+)$/);
  const selQ = m ? decodeURIComponent(m[1]) : ""; // id TỪ URL

  const [quotations, setQuotations] = useState<Q[]>([]);
  const [detail, setDetail] = useState<QDetail | null>(null);
  const [editItems, setEditItems] = useState<EditItem[] | null>(null); // đang sửa sản phẩm
  const [picker, setPicker] = useState(false); // đang mở picker chọn template từ kho
  const [poolTpls, setPoolTpls] = useState<PoolTpl[]>([]); // template trong kho (chưa gắn báo giá)
  const [detach_, setDetach_] = useState<{ id: string; name: string } | null>(null); // xác nhận gỡ template về kho
  const [qsearch, setQsearch] = useState(""); // tìm kiếm danh sách báo giá
  const [qpage, setQpage] = useState(1); // trang danh sách
  const [delQ, setDelQ] = useState<{ id: string; code: string } | null>(null); // xác nhận xóa báo giá
  const [err, setErr] = useState("");

  const loadList = useCallback(async () => {
    try { setQuotations(await getJSON<Q[]>("/api/quotations")); } catch (e) { setErr((e as Error).message); }
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try { setDetail(await getJSON<QDetail>(`/api/quotations/${id}`)); } catch (e) { setErr((e as Error).message); }
  }, []);

  function openEditor() {
    const rows = detail?.items ?? [];
    setEditItems(
      rows.length
        ? rows.map((r) => ({ product: r.product, packing: r.packing || "", unit: r.unit || "", quantity: String(num(r.quantity)), price: String(num(r.price)) }))
        : [{ product: "", packing: "", unit: "", quantity: "1", price: "0" }],
    );
  }
  async function saveEditor() {
    if (!selQ || !editItems) return;
    setErr("");
    try {
      const items = editItems.filter((i) => i.product.trim()).map((i, idx) => ({ no: idx + 1, ...i }));
      await putJSON(`/api/quotations/${selQ}/items`, { items });
      setEditItems(null);
      await loadDetail(selQ);
      toast.success("Đã lưu sản phẩm báo giá");
    } catch (e) { toast.error((e as Error).message); }
  }

  // ---- Gắn/gỡ template (tạo & sửa nội dung ở menu Template) ----
  function openPicker() {
    setPicker(true);
    getJSON<PoolTpl[]>("/api/templates?pool=1").then(setPoolTpls).catch((e) => setErr((e as Error).message));
  }
  async function attachTpl(id: string) {
    if (!selQ) return;
    setErr("");
    try { await patchJSON(`/api/templates/${id}`, { quotationId: selQ }); setPicker(false); await loadDetail(selQ); toast.success("Đã gắn template"); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function doDetach() {
    if (!detach_) return;
    setErr("");
    try { await patchJSON(`/api/templates/${detach_.id}`, { quotationId: null }); setDetach_(null); await loadDetail(selQ); toast.success("Đã gỡ template về kho"); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function doDelQ() {
    if (!delQ) return;
    setErr("");
    try { await sendJSON("DELETE", `/api/quotations/${delQ.id}`); setDelQ(null); await loadList(); toast.success("Đã xóa báo giá"); }
    catch (e) { toast.error((e as Error).message); }
  }

  useEffect(() => {
    if (selQ) return;
    (async () => { await loadList(); })();
  }, [selQ, loadList]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selQ) { if (!cancelled) setDetail(null); return; }
      if (!cancelled) { setErr(""); setDetail(null); }
      await loadDetail(selQ);
    })();
    return () => { cancelled = true; };
  }, [selQ, loadDetail]);

  const errBox = err ? <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div> : null;

  // ---------- DANH SÁCH BÁO GIÁ ----------
  if (!selQ) {
    return (
      (() => {
        const kw = qsearch.trim().toLowerCase();
        const filtered = quotations.filter((q) => !kw || q.code.toLowerCase().includes(kw) || (q.title || "").toLowerCase().includes(kw) || (q.market || "").toLowerCase().includes(kw));
        const total = Math.max(1, Math.ceil(filtered.length / 12));
        const cur = Math.min(qpage, total);
        const pageRows = filtered.slice((cur - 1) * 12, cur * 12);
        return (
          <div>
            {errBox}
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap")}>
              <div style={sx("position:relative; width:280px")}>
                <span style={sx("position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0")}>🔍</span>
                <HInput s="height:36px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px 0 32px; font-size:13.5px; color:#14261A; outline:none; width:100%;" focus={focus} value={qsearch} onChange={(e) => { setQsearch(e.target.value); setQpage(1); }} placeholder="Tìm mã, tiêu đề, thị trường..." />
              </div>
              <div style={sx("font-size:13px; color:#7B8A80")}>{filtered.length} báo giá</div>
            </div>
            {filtered.length === 0 && <div style={sx(card + "; font-size:13px; color:#8B9A90")}>{quotations.length === 0 ? "Chưa có báo giá. Bấm “+ Báo giá mới”." : "Không tìm thấy báo giá khớp."}</div>}
            <div style={sx("display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr)); gap:14px")}>
              {pageRows.map((q) => (
                <div key={q.id} style={sx("display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:16px")}>
                  <div onClick={() => router.push(`/bao-gia/${q.id}`)} style={sx("display:flex; align-items:center; gap:12px; min-width:0; flex:1; cursor:pointer")}>
                    <div style={sx("width:44px; height:44px; border-radius:12px; background:#EAF3EC; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0")}>📄</div>
                    <div style={sx("min-width:0; flex:1")}>
                      <div style={sx("font-size:15px; font-weight:700; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.code}</div>
                      <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.title || "—"} · {q._count.templates} template</div>
                    </div>
                    <div style={sx("text-align:right; flex-shrink:0")}>
                      <div style={sx("font-size:13.5px; font-weight:700; color:#14261A")}>{money(q.totalAmount, q.currency)}</div>
                      <div style={sx("font-size:11.5px; color:#7B8A80")}>{q.market || q.status}</div>
                    </div>
                  </div>
                  <HButton s="width:32px; height:34px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0" title="Xóa báo giá" onClick={() => setDelQ({ id: q.id, code: q.code })}>🗑</HButton>
                </div>
              ))}
            </div>
            {total > 1 && (
              <div style={sx("display:flex; align-items:center; gap:8px; margin-top:14px")}>
                <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>Trang {cur}/{total}</div>
                <HButton s={`${ghost} ${cur <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setQpage(cur - 1)}>‹ Trước</HButton>
                <HButton s={`${ghost} ${cur >= total ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setQpage(cur + 1)}>Sau ›</HButton>
              </div>
            )}
            {delQ && (
              <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
                <div onClick={() => setDelQ(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
                <div style={sx("position:relative; width:100%; max-width:430px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
                  <div style={sx("font-size:17px; font-weight:700; color:#14261A; margin-bottom:8px")}>Xóa báo giá?</div>
                  <div style={sx("font-size:13.5px; line-height:1.55; color:#4A5A4E; margin-bottom:18px")}>Xóa hẳn <strong style={sx("color:#14261A")}>“{delQ.code}”</strong> cùng sản phẩm & lệnh gửi của nó. Template của báo giá sẽ được đưa về kho. Không thể hoàn tác.</div>
                  <div style={sx("display:flex; gap:10px")}>
                    <HButton s="flex:1; height:44px; border:none; border-radius:11px; background:#B3261E; color:#fff; font-size:14px; font-weight:600; cursor:pointer" onClick={doDelQ}>Xóa báo giá</HButton>
                    <HButton s={`${ghost} height:44px`} onClick={() => setDelQ(null)}>Hủy</HButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()
    );
  }

  // ---------- CHI TIẾT BÁO GIÁ ----------
  return (
    <div style={sx("max-width:960px")}>
      <HButton s="display:inline-flex; align-items:center; gap:7px; border:none; background:none; color:#2F8F4E; font-size:13.5px; font-weight:600; cursor:pointer; padding:0; margin-bottom:14px" onClick={() => router.push("/bao-gia")}>‹ Danh sách báo giá</HButton>
      {errBox}

      {/* Hero */}
      <div style={sx("border-radius:18px; padding:24px; background:linear-gradient(130deg,#1F7440,#123E24); color:#fff; box-shadow:0 20px 44px -26px rgba(18,62,36,.7)")}>
        <div style={sx("display:flex; align-items:center; gap:16px")}>
          <div style={sx("width:60px; height:60px; border-radius:16px; background:rgba(255,255,255,.16); display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0")}>📄</div>
          <div style={sx("min-width:0; flex:1")}>
            <div style={sx("font-size:24px; font-weight:700; letter-spacing:-0.02em")}>{detail?.code || "…"}</div>
            <div style={sx("font-size:13.5px; color:#B7DBC4; margin-top:3px")}>{detail?.title || ""}</div>
          </div>
          {detail && <span style={sx("font-size:12px; font-weight:700; background:rgba(255,255,255,.18); color:#fff; padding:6px 13px; border-radius:20px; white-space:nowrap")}>{detail.status}</span>}
        </div>
      </div>

      {/* Thẻ thông tin */}
      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:12px; margin-top:14px")}>
        <Stat label="Tổng giá trị" value={detail ? money(detail.totalAmount, detail.currency) : "—"} />
        <Stat label="Thị trường" value={detail?.market || "—"} />
        <Stat label="Hiệu lực đến" value={fmtDate(detail?.validUntil ?? null)} />
        <Stat label="Ngày phát hành" value={fmtDate(detail?.issuedDate ?? null)} />
        <Stat label="Số template" value={`${detail?._count.templates ?? 0}`} />
        <Stat label="Trạng thái" value={detail?.status || "—"} />
      </div>

      {/* Sản phẩm */}
      <div style={sx(card + "; margin-top:14px")}>
        <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
          <span style={sx("width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)")} />
          <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Sản phẩm ({detail?.items.length ?? 0})</div>
          <HButton s={ghost} onClick={openEditor}>Sửa sản phẩm</HButton>
        </div>
        {(!detail || detail.items.length === 0) && <div style={sx("font-size:13px; color:#8B9A90")}>Chưa có sản phẩm. Bấm “Sửa sản phẩm” để thêm.</div>}
        {detail && detail.items.length > 0 && (
          <div style={sx("border:1px solid #EEF2EE; border-radius:12px; overflow:hidden")}>
            <div style={sx("display:flex; background:#EAF3EC; color:#1F7440; font-weight:600; font-size:13px; height:38px; align-items:center")}>
              <div style={sx(cell(0.5, "center"))}>#</div>
              <div style={sx(cell(3, "flex-start"))}>Mặt hàng</div>
              <div style={sx(cell(1.4, "flex-end"))}>SL</div>
              <div style={sx(cell(1.6, "flex-end"))}>Đơn giá</div>
              <div style={sx(cell(1.8, "flex-end"))}>Thành tiền</div>
            </div>
            {detail.items.map((it, i) => (
              <div key={it.id} style={sx(`display:flex; font-size:13px; height:42px; align-items:center; background:${i % 2 ? "#F7FAF7" : "#fff"}; border-top:1px solid #F0F3F0`)}>
                <div style={sx(cell(0.5, "center"))}>{it.no || i + 1}</div>
                <div style={sx(cell(3, "flex-start") + "; flex-direction:column; align-items:flex-start; justify-content:center")}>
                  <div style={sx("font-weight:600; color:#14261A")}>{it.product}</div>
                  {it.packing && <div style={sx("font-size:11px; color:#8B9A90")}>{it.packing}</div>}
                </div>
                <div style={sx(cell(1.4, "flex-end"))}>{num(it.quantity).toLocaleString("vi-VN")} {it.unit || ""}</div>
                <div style={sx(cell(1.6, "flex-end"))}>{money(it.price, detail.currency)}</div>
                <div style={sx(cell(1.8, "flex-end") + "; font-weight:600; color:#14261A")}>{money(num(it.quantity) * num(it.price), detail.currency)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template của báo giá */}
      <div style={sx(card + "; margin-top:14px")}>
        <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
          <span style={sx("width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)")} />
          <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Template ({detail?.templates.length ?? 0})</div>
          <HButton s={green} onClick={openPicker}>+ Thêm template</HButton>
        </div>
        {(!detail || detail.templates.length === 0) && <div style={sx("font-size:13px; color:#8B9A90")}>Chưa có template. Bấm “+ Thêm template” để chọn từ kho (tạo/sửa template ở menu Template).</div>}
        <div style={sx("display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:8px")}>
          {detail?.templates.map((t) => (
            <div key={t.id} style={sx("display:flex; align-items:center; gap:10px; border:1px solid #E9EEE9; border-radius:11px; padding:10px 12px; background:#fff")}>
              <div onClick={() => router.push(`/template/${t.id}`)} style={sx("display:flex; align-items:center; gap:10px; min-width:0; flex:1; cursor:pointer")}>
                <span style={sx("font-size:17px")}>{t.icon || "📄"}</span>
                <div style={sx("min-width:0; flex:1")}>
                  <div style={sx("font-size:13.5px; font-weight:600; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{t.name}</div>
                  <div style={sx("font-size:12px; color:#8B9A90")}>{t._count.customerLinks} khách · {t.channel?.type || "chưa gắn kênh"}</div>
                </div>
              </div>
              <HButton s="width:32px; height:34px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0" title="Gỡ khỏi báo giá (về kho)" onClick={() => setDetach_({ id: t.id, name: t.name })}>×</HButton>
            </div>
          ))}
        </div>
      </div>

      {/* Modal sửa sản phẩm */}
      {editItems && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setEditItems(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:760px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Sản phẩm — {detail?.code}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setEditItems(null)}>✕</HButton>
            </div>

            <div style={sx("display:flex; flex-direction:column; gap:8px")}>
              {editItems.map((it, i) => (
                <div key={i} style={sx("display:flex; gap:6px; align-items:center")}>
                  <span style={sx("width:20px; font-size:12px; color:#8B9A90")}>{i + 1}</span>
                  <HInput s={`${inp} flex:2.6`} focus={focus} value={it.product} onChange={(e) => setEditItems(editItems.map((x, j) => (j === i ? { ...x, product: e.target.value } : x)))} placeholder="Mặt hàng" />
                  <HInput s={`${inp} flex:1.4`} focus={focus} value={it.unit} onChange={(e) => setEditItems(editItems.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} placeholder="Đơn vị" />
                  <HInput s={`${inp} flex:1.1`} focus={focus} value={it.quantity} onChange={(e) => setEditItems(editItems.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} placeholder="SL" />
                  <HInput s={`${inp} flex:1.5`} focus={focus} value={it.price} onChange={(e) => setEditItems(editItems.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="Đơn giá" />
                  <HButton s="width:32px; height:38px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0" onClick={() => setEditItems(editItems.filter((_, j) => j !== i))}>✕</HButton>
                </div>
              ))}
            </div>
            <HButton s={`${ghost} margin-top:10px`} onClick={() => setEditItems([...editItems, { product: "", packing: "", unit: "", quantity: "1", price: "0" }])}>+ Thêm dòng</HButton>
            <div style={sx("display:flex; align-items:center; gap:12px; margin-top:16px; padding-top:14px; border-top:1px solid #EDF1ED")}>
              <div style={sx("flex:1; font-size:14px; color:#3C4A40")}>Tổng: <strong style={sx("color:#14261A")}>{money(editItems.reduce((s, it) => s + num(it.quantity) * num(it.price), 0), detail?.currency || "VND")}</strong></div>
              <HButton s={green} onClick={saveEditor}>Lưu sản phẩm</HButton>
              <HButton s={ghost} onClick={() => setEditItems(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}

      {/* Picker chọn template từ kho để gắn vào báo giá */}
      {picker && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setPicker(false)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:520px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:6px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Thêm template vào {detail?.code}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setPicker(false)}>✕</HButton>
            </div>
            <div style={sx("font-size:12.5px; color:#8B9A90; margin-bottom:14px")}>Chọn template có sẵn trong kho. Muốn tạo mới hoặc sửa nội dung, vào menu <strong style={sx("color:#3C4A40")}>Template</strong>.</div>

            <div style={sx("display:flex; flex-direction:column; gap:8px")}>
              {poolTpls.length === 0 && (
                <div style={sx("font-size:13px; color:#8B9A90; padding:6px 0")}>
                  Kho không còn template nào. <HButton s={`${ghost} margin-left:6px`} onClick={() => router.push("/template")}>Sang menu Template</HButton>
                </div>
              )}
              {poolTpls.map((t) => (
                <button key={t.id} onClick={() => attachTpl(t.id)}
                  style={sx("display:flex; align-items:center; gap:10px; text-align:left; border-width:1px; border-style:solid; border-color:#E9EEE9; border-radius:11px; padding:11px 12px; background:#fff; cursor:pointer; width:100%")}>
                  <span style={sx("font-size:18px")}>{t.icon || "📄"}</span>
                  <div style={sx("min-width:0; flex:1")}>
                    <div style={sx("font-size:13.5px; font-weight:600; color:#14261A")}>{t.name}</div>
                    <div style={sx("font-size:12px; color:#8B9A90")}>{t._count.customerLinks} khách · {t.channel?.type || "chưa gắn kênh"}</div>
                  </div>
                  <span style={sx("font-size:12.5px; font-weight:600; color:#1F7440; background:#EAF3EC; border-radius:8px; padding:5px 11px; flex-shrink:0")}>+ Gắn</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận gỡ template về kho */}
      {detach_ && (
        <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setDetach_(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:420px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("font-size:17px; font-weight:700; color:#14261A; margin-bottom:8px")}>Gỡ template khỏi báo giá?</div>
            <div style={sx("font-size:13.5px; line-height:1.55; color:#4A5A4E; margin-bottom:18px")}>
              Gỡ <strong style={sx("color:#14261A")}>“{detach_.name}”</strong> khỏi báo giá này. Template <strong>không bị xóa</strong> — nó trở về kho và có thể gắn lại sau (xóa hẳn ở menu Template).
            </div>
            <div style={sx("display:flex; gap:10px")}>
              <HButton s="flex:1; height:44px; border:none; border-radius:11px; background:#B3261E; color:#fff; font-size:14px; font-weight:600; cursor:pointer" onClick={doDetach}>Gỡ về kho</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setDetach_(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
