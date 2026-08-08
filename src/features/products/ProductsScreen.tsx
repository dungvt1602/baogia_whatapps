"use client";

import { useCallback, useEffect, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON, sendJSON } from "@/components/common/api";

type Product = {
  id: string;
  name: string;
  unit: string | null;
  packing: string | null;
  price: unknown;
  currency: string;
  market: string | null;
  note: string | null;
  isActive: boolean;
};
type Form = { id?: string; name: string; unit: string; packing: string; price: string; currency: string; market: string; note: string };

const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:16px";
const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:9px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 14px; height:38px;";
const ghost = "border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";
const num = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
const money = (v: unknown, cur: string) => `${num(v).toLocaleString("vi-VN")} ${cur}`;

const empty = (): Form => ({ name: "", unit: "", packing: "", price: "0", currency: "VND", market: "", note: "" });

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
      <span style={sx(lbl)}>{label}</span>
      <HInput s={inp} focus={focus} value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setProducts(await getJSON<Product[]>("/api/products")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openEdit(p: Product) {
    setForm({ id: p.id, name: p.name, unit: p.unit || "", packing: p.packing || "", price: String(num(p.price)), currency: p.currency, market: p.market || "", note: p.note || "" });
  }

  async function save() {
    if (!form?.name) return setErr("Nhập tên sản phẩm");
    setErr("");
    try {
      if (form.id) await patchJSON(`/api/products/${form.id}`, form);
      else await postJSON("/api/products", form);
      setForm(null); await load();
    } catch (e) { setErr((e as Error).message); }
  }
  async function del(p: Product) {
    if (!window.confirm(`Xóa sản phẩm "${p.name}"?`)) return;
    setErr("");
    try { await sendJSON("DELETE", `/api/products/${p.id}`); await load(); }
    catch (e) { setErr((e as Error).message); }
  }

  return (
    <div>
      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
        <div style={sx("font-size:13.5px; color:#7B8A80; flex:1")}>Kho sản phẩm dùng chung — chỉnh giá, thông tin và thêm mặt hàng mới.</div>
        <HButton s={green} onClick={() => setForm(empty())}>+ Thêm sản phẩm</HButton>
      </div>

      {products.length === 0 && <div style={sx(card + "; font-size:13px; color:#8B9A90")}>Chưa có sản phẩm. Bấm “+ Thêm sản phẩm”.</div>}

      <div style={sx("display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:12px")}>
        {products.map((p) => (
          <div key={p.id} style={sx(card + "; display:flex; flex-direction:column; gap:10px")}>
            <div style={sx("display:flex; align-items:flex-start; gap:10px")}>
              <div style={sx("width:40px; height:40px; border-radius:11px; background:#EAF3EC; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0")}>🍎</div>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:14.5px; font-weight:700; color:#14261A")}>{p.name}</div>
                <div style={sx("font-size:12px; color:#8B9A90")}>{[p.packing, p.unit].filter(Boolean).join(" · ") || "—"}{p.market ? ` · ${p.market}` : ""}</div>
              </div>
              {!p.isActive && <span style={sx("font-size:11px; font-weight:700; color:#B3261E; background:#FDECEC; padding:3px 9px; border-radius:20px")}>Tắt</span>}
            </div>
            <div style={sx("display:flex; align-items:center; gap:8px")}>
              <div style={sx("flex:1; font-size:16px; font-weight:700; color:#1F7440")}>{money(p.price, p.currency)}</div>
              <HButton s={ghost} onClick={() => openEdit(p)}>Sửa</HButton>
              <HButton s="width:34px; height:34px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0" title="Xóa" onClick={() => del(p)}>🗑</HButton>
            </div>
          </div>
        ))}
      </div>

      {/* Modal thêm/sửa */}
      {form && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setForm(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:460px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:16px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>{form.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setForm(null)}>✕</HButton>
            </div>
            <Field label="Tên sản phẩm *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Thanh long ruột đỏ" />
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1")}><Field label="Đơn vị" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg" /></div>
              <div style={sx("flex:1")}><Field label="Quy cách" value={form.packing} onChange={(e) => setForm({ ...form, packing: e.target.value })} placeholder="Thùng 5kg" /></div>
            </div>
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1.4")}><Field label="Giá (sửa được)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="3200" /></div>
              <div style={sx("width:100px")}><Field label="Tiền tệ" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
            </div>
            <Field label="Thị trường" value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} placeholder="INDIA" />
            <Field label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Tuỳ chọn" />
            <div style={sx("display:flex; gap:10px; margin-top:6px")}>
              <HButton s={`${green} flex:1; height:44px`} onClick={save}>{form.id ? "Lưu thay đổi" : "Thêm sản phẩm"}</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setForm(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
