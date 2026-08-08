"use client";

import { useCallback, useEffect, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, putJSON } from "@/components/common/api";

type Q = { id: string; code: string; title: string | null; market: string | null; currency: string; status: string; _count: { templates: number } };
type Ch = { id: string; name: string; type: string };
type T = { id: string; name: string; icon: string | null; waTemplateName: string | null; channel: { id: string; name: string; type: string } | null; _count: { customers: number } };
type C = { id: string; name: string; whatsappPhone: string | null; phone: string | null; status: string; receiveQuotation: boolean; market: string | null };
type Item = { id?: string; no: number; product: string; packing: string; unit: string; quantity: string; price: string };

const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:16px; display:flex; flex-direction:column; min-height:120px";
const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";
const green = "border:none; border-radius:9px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 14px; height:38px;";
const ghost = "border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const num = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
const money = (v: unknown, cur: string) => `${num(v).toLocaleString("vi-VN")} ${cur}`;

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string }) {
  return (
    <label style={sx("display:flex; flex-direction:column; margin-bottom:10px")}>
      <span style={sx(lbl)}>{label}</span>
      <HInput s={inp} focus={focus} value={value} onChange={onChange} placeholder={placeholder} type={type} />
    </label>
  );
}

export default function Manage() {
  const [quotations, setQuotations] = useState<Q[]>([]);
  const [channels, setChannels] = useState<Ch[]>([]);
  const [selQ, setSelQ] = useState<string>("");
  const [templates, setTemplates] = useState<T[]>([]);
  const [selT, setSelT] = useState<string>("");
  const [customers, setCustomers] = useState<C[]>([]);
  const [err, setErr] = useState("");

  // form toggles
  const [qForm, setQForm] = useState<null | { code: string; title: string; market: string; currency: string }>(null);
  const [tForm, setTForm] = useState<null | { name: string; icon: string; body: string; channelId: string; waTemplateName: string }>(null);
  const [cForm, setCForm] = useState<null | { name: string; whatsappPhone: string; market: string; status: string; receiveQuotation: boolean }>(null);
  const [items, setItems] = useState<Item[] | null>(null); // modal sản phẩm

  const loadQuotations = useCallback(async () => {
    try { setQuotations(await getJSON<Q[]>("/api/quotations")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => {
    loadQuotations();
    getJSON<Ch[]>("/api/channels").then(setChannels).catch(() => {});
  }, [loadQuotations]);

  const pickQ = useCallback(async (id: string) => {
    setSelQ(id); setSelT(""); setCustomers([]); setTemplates([]); setErr("");
    try { setTemplates(await getJSON<T[]>(`/api/quotations/${id}/templates`)); } catch (e) { setErr((e as Error).message); }
  }, []);
  const pickT = useCallback(async (id: string) => {
    setSelT(id); setErr("");
    try { setCustomers(await getJSON<C[]>(`/api/templates/${id}/customers`)); } catch (e) { setErr((e as Error).message); }
  }, []);

  async function submitQ() {
    if (!qForm?.code) return setErr("Nhập mã báo giá");
    try {
      const q = await postJSON<Q>("/api/quotations", qForm);
      setQForm(null); await loadQuotations(); pickQ(q.id);
    } catch (e) { setErr((e as Error).message); }
  }
  async function submitT() {
    if (!selQ || !tForm?.name) return setErr("Chọn báo giá và nhập tên template");
    try {
      await postJSON(`/api/quotations/${selQ}/templates`, tForm);
      setTForm(null);
      setTemplates(await getJSON<T[]>(`/api/quotations/${selQ}/templates`));
      await loadQuotations(); // cập nhật số template ở cột Báo giá
    } catch (e) { setErr((e as Error).message); }
  }
  async function submitC() {
    if (!selT || !cForm?.name) return setErr("Chọn template và nhập tên khách");
    try {
      await postJSON(`/api/templates/${selT}/customers`, cForm);
      setCForm(null); setCustomers(await getJSON<C[]>(`/api/templates/${selT}/customers`));
      setTemplates(await getJSON<T[]>(`/api/quotations/${selQ}/templates`)); // cập nhật số khách
    } catch (e) { setErr((e as Error).message); }
  }

  async function openItems() {
    if (!selQ) return;
    try {
      const rows = await getJSON<Item[]>(`/api/quotations/${selQ}/items`);
      setItems(rows.length ? rows.map((r) => ({ ...r, quantity: String(r.quantity), price: String(r.price), packing: r.packing || "", unit: r.unit || "" })) : [{ no: 1, product: "", packing: "", unit: "", quantity: "1", price: "0" }]);
    } catch (e) { setErr((e as Error).message); }
  }
  async function saveItems() {
    if (!selQ || !items) return;
    try {
      await putJSON(`/api/quotations/${selQ}/items`, { items: items.filter((i) => i.product.trim()) });
      setItems(null); await loadQuotations();
    } catch (e) { setErr((e as Error).message); }
  }

  const selQObj = quotations.find((q) => q.id === selQ);
  const itemsTotal = items ? items.reduce((s, it) => s + num(it.quantity) * num(it.price), 0) : 0;

  return (
    <div>
      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:14px; align-items:start")}>
        {/* ---- Cột 1: Báo giá ---- */}
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Báo giá</div>
            <HButton s={ghost} onClick={() => setQForm(qForm ? null : { code: "", title: "", market: "", currency: "VND" })}>{qForm ? "Đóng" : "+ Thêm"}</HButton>
          </div>
          {qForm && (
            <div style={sx("border:1px dashed #CFE0D4; border-radius:12px; padding:12px; margin-bottom:12px; background:#F8FBF8")}>
              <Field label="Mã báo giá *" value={qForm.code} onChange={(e) => setQForm({ ...qForm, code: e.target.value })} placeholder="VD: BG-2026-0002" />
              <Field label="Tiêu đề" value={qForm.title} onChange={(e) => setQForm({ ...qForm, title: e.target.value })} placeholder="VD: Thanh long xuất Ấn" />
              <div style={sx("display:flex; gap:8px")}>
                <div style={sx("flex:1")}><Field label="Thị trường" value={qForm.market} onChange={(e) => setQForm({ ...qForm, market: e.target.value })} placeholder="INDIA" /></div>
                <div style={sx("width:90px")}><Field label="Tiền tệ" value={qForm.currency} onChange={(e) => setQForm({ ...qForm, currency: e.target.value })} /></div>
              </div>
              <HButton s={`${green} width:100%`} onClick={submitQ}>Tạo báo giá</HButton>
            </div>
          )}
          <div style={sx("display:flex; flex-direction:column; gap:6px")}>
            {quotations.map((q) => {
              const on = q.id === selQ;
              return (
                <HButton key={q.id} onClick={() => pickQ(q.id)} s={`display:block; width:100%; text-align:left; border:1px solid ${on ? "#3EA85C" : "#E9EEE9"}; border-radius:11px; padding:10px 12px; cursor:pointer; background:${on ? "#F0F7F1" : "#fff"}`} h={on ? "" : "background:#F7FAF7"}>
                  <div style={sx("font-size:13.5px; font-weight:600; color:#14261A")}>{q.code}</div>
                  <div style={sx("font-size:12px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.title || "—"} · {q._count.templates} template</div>
                </HButton>
              );
            })}
          </div>
          {selQObj && (
            <HButton s={`${ghost} margin-top:12px`} onClick={openItems}>Sản phẩm của {selQObj.code} →</HButton>
          )}
        </div>

        {/* ---- Cột 2: Template ---- */}
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Template</div>
            {selQ && <HButton s={ghost} onClick={() => setTForm(tForm ? null : { name: "", icon: "🌐", body: "Kính gửi {khách hàng},\n\n{bảng sản phẩm}\n\nTổng: {tổng}. Hiệu lực đến {hiệu lực}.", channelId: channels[0]?.id || "", waTemplateName: "" })}>{tForm ? "Đóng" : "+ Thêm"}</HButton>}
          </div>
          {!selQ && <div style={sx("font-size:13px; color:#8B9A90")}>Chọn báo giá bên trái.</div>}
          {tForm && (
            <div style={sx("border:1px dashed #CFE0D4; border-radius:12px; padding:12px; margin-bottom:12px; background:#F8FBF8")}>
              <Field label="Tên template *" value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} placeholder="VD: Chuẩn quốc tế" />
              <label style={sx("display:flex; flex-direction:column; margin-bottom:10px")}>
                <span style={sx(lbl)}>Nội dung (biến: {"{khách hàng} {mã} {bảng sản phẩm} {tổng} {hiệu lực}"})</span>
                <textarea value={tForm.body} onChange={(e) => setTForm({ ...tForm, body: e.target.value })} rows={4} style={{ ...sx(inp), height: "auto", padding: "10px 11px", lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
              </label>
              <label style={sx("display:flex; flex-direction:column; margin-bottom:10px")}>
                <span style={sx(lbl)}>Kênh gửi</span>
                <select value={tForm.channelId} onChange={(e) => setTForm({ ...tForm, channelId: e.target.value })} style={sx(inp)}>
                  <option value="">— chưa gắn —</option>
                  {channels.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
              </label>
              <Field label="WhatsApp template name (để gửi thật, tuỳ chọn)" value={tForm.waTemplateName} onChange={(e) => setTForm({ ...tForm, waTemplateName: e.target.value })} placeholder="daily_quotation_india_image" />
              <HButton s={`${green} width:100%`} onClick={submitT}>Thêm template</HButton>
            </div>
          )}
          <div style={sx("display:flex; flex-direction:column; gap:6px")}>
            {templates.map((t) => {
              const on = t.id === selT;
              return (
                <HButton key={t.id} onClick={() => pickT(t.id)} s={`display:flex; align-items:center; gap:10px; width:100%; text-align:left; border:1px solid ${on ? "#3EA85C" : "#E9EEE9"}; border-radius:11px; padding:10px 12px; cursor:pointer; background:${on ? "#F0F7F1" : "#fff"}`} h={on ? "" : "background:#F7FAF7"}>
                  <span style={sx("font-size:16px")}>{t.icon || "📄"}</span>
                  <div style={sx("min-width:0; flex:1")}>
                    <div style={sx("font-size:13.5px; font-weight:600; color:#14261A")}>{t.name}</div>
                    <div style={sx("font-size:12px; color:#8B9A90")}>{t._count.customers} khách · {t.channel?.type || "chưa gắn kênh"}{t.waTemplateName ? " · WA template" : ""}</div>
                  </div>
                </HButton>
              );
            })}
          </div>
        </div>

        {/* ---- Cột 3: Khách hàng ---- */}
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
            <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Khách hàng</div>
            {selT && <HButton s={ghost} onClick={() => setCForm(cForm ? null : { name: "", whatsappPhone: "", market: "", status: "ACTIVE", receiveQuotation: true })}>{cForm ? "Đóng" : "+ Thêm"}</HButton>}
          </div>
          {!selT && <div style={sx("font-size:13px; color:#8B9A90")}>Chọn template ở giữa.</div>}
          {cForm && (
            <div style={sx("border:1px dashed #CFE0D4; border-radius:12px; padding:12px; margin-bottom:12px; background:#F8FBF8")}>
              <Field label="Tên khách *" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} placeholder="VD: Fresh Orient GmbH" />
              <Field label="Số WhatsApp" value={cForm.whatsappPhone} onChange={(e) => setCForm({ ...cForm, whatsappPhone: e.target.value })} placeholder="84901234001" />
              <Field label="Thị trường" value={cForm.market} onChange={(e) => setCForm({ ...cForm, market: e.target.value })} placeholder="INDIA" />
              <label style={sx("display:flex; align-items:center; gap:8px; font-size:13px; color:#3C4A40; margin-bottom:10px; cursor:pointer")}>
                <input type="checkbox" checked={cForm.receiveQuotation} onChange={(e) => setCForm({ ...cForm, receiveQuotation: e.target.checked })} style={sx("width:15px; height:15px; accent-color:#2F8F4E")} />
                Nhận báo giá
              </label>
              <HButton s={`${green} width:100%`} onClick={submitC}>Thêm khách</HButton>
            </div>
          )}
          <div style={sx("display:flex; flex-direction:column; gap:6px")}>
            {customers.map((c) => (
              <div key={c.id} style={sx("display:flex; align-items:center; gap:10px; border:1px solid #E9EEE9; border-radius:11px; padding:10px 12px")}>
                <div style={sx("min-width:0; flex:1")}>
                  <div style={sx("font-size:13.5px; font-weight:600; color:#14261A")}>{c.name}</div>
                  <div style={sx("font-size:12px; color:#8B9A90")}>{c.whatsappPhone || c.phone || "(chưa có SĐT)"}</div>
                </div>
                <span style={sx(`font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; background:${c.status === "ACTIVE" ? "#E7F5EC" : "#FDECEC"}; color:${c.status === "ACTIVE" ? "#1F7440" : "#B3261E"}`)}>{c.status}</span>
                {!c.receiveQuotation && <span style={sx("font-size:11px; color:#B07208")}>không nhận</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Modal Sản phẩm ---- */}
      {items && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setItems(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:720px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Sản phẩm — {selQObj?.code}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setItems(null)}>✕</HButton>
            </div>
            <div style={sx("display:flex; flex-direction:column; gap:8px")}>
              {items.map((it, i) => (
                <div key={i} style={sx("display:flex; gap:6px; align-items:center")}>
                  <span style={sx("width:20px; font-size:12px; color:#8B9A90")}>{i + 1}</span>
                  <HInput s={`${inp} flex:2.4`} focus={focus} value={it.product} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, product: e.target.value } : x))} placeholder="Mặt hàng" />
                  <HInput s={`${inp} flex:1.4`} focus={focus} value={it.unit} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} placeholder="Đơn vị" />
                  <HInput s={`${inp} flex:1.2`} focus={focus} value={it.quantity} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} placeholder="SL" />
                  <HInput s={`${inp} flex:1.6`} focus={focus} value={it.price} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} placeholder="Đơn giá" />
                  <HButton s="width:32px; height:38px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</HButton>
                </div>
              ))}
            </div>
            <HButton s={`${ghost} margin-top:10px`} onClick={() => setItems([...items, { no: items.length + 1, product: "", packing: "", unit: "", quantity: "1", price: "0" }])}>+ Thêm dòng</HButton>
            <div style={sx("display:flex; align-items:center; gap:12px; margin-top:16px; padding-top:14px; border-top:1px solid #EDF1ED")}>
              <div style={sx("flex:1; font-size:14px; color:#3C4A40")}>Tổng: <strong style={sx("color:#14261A")}>{money(itemsTotal, selQObj?.currency || "VND")}</strong></div>
              <HButton s={green} onClick={saveItems}>Lưu sản phẩm</HButton>
              <HButton s={ghost} onClick={() => setItems(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
