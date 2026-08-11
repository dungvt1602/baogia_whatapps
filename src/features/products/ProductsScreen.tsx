"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON, sendJSON } from "@/components/common/api";
import { toast } from "sonner";

type Product = {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  giaMua: unknown; // null = hết hàng
  haoHut: unknown;
  vanChuyen: unknown;
  giaFinal: unknown;
  currency: string;
  status: string;
  note: string | null;
};
type Form = { id?: string; code: string; name: string; unit: string; giaMua: string; haoHut: string; vanChuyen: string; status: string; note: string };
type SortKey = "code" | "name" | "unit" | "giaMua" | "haoHut" | "vanChuyen" | "giaFinal" | "status";

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:8px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 13px; height:34px;";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";

// Lưới kiểu Ecount: viền đầy đủ, header xám, ô compact.
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; user-select:none; text-align:left; position:sticky; top:0";
const gtd = "padding:6px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; white-space:nowrap; background:inherit";

const toNum = (v: unknown): number | null => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const vnd = (v: unknown) => { const n = toNum(v); return n == null ? "—" : n.toLocaleString("vi-VN"); };
const calcFinal = (giaMua: string, haoHut: string, vanChuyen: string): number | null => {
  const g = toNum(giaMua); if (g == null) return null;
  return g * (1 + (toNum(haoHut) ?? 0) / 100) + (toNum(vanChuyen) ?? 0);
};

const empty = (): Form => ({ code: "", name: "", unit: "KG", giaMua: "", haoHut: "0", vanChuyen: "0", status: "ACTIVE", note: "" });

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
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<{ text: string; run: () => Promise<void> } | null>(null); // xác nhận xóa
  const [detail, setDetail] = useState<Product | null>(null); // xem chi tiết
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "code", dir: "asc" });

  const load = useCallback(async () => {
    try { setProducts(await getJSON<Product[]>("/api/products")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  // Lọc theo mã/tên + sắp xếp theo cột.
  const view = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const numeric = ["giaMua", "haoHut", "vanChuyen", "giaFinal"].includes(sort.key);
    const arr = products.filter((p) => !kw || p.code.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw));
    arr.sort((a, b) => {
      const ra = a as unknown as Record<string, unknown>, rb = b as unknown as Record<string, unknown>;
      if (numeric) return (toNum(ra[sort.key]) ?? -Infinity) - (toNum(rb[sort.key]) ?? -Infinity);
      const va = String(ra[sort.key] ?? "").toLowerCase(), vb = String(rb[sort.key] ?? "").toLowerCase();
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
    return sort.dir === "desc" ? arr.reverse() : arr;
  }, [products, q, sort]);

  const totalPages = Math.max(1, Math.ceil(view.length / 15));
  const curPage = Math.min(page, totalPages);
  const paged = view.slice((curPage - 1) * 15, curPage * 15);

  const allChecked = paged.length > 0 && paged.every((p) => selected.has(p.id));
  function toggleAll() { const s = new Set(selected); if (allChecked) paged.forEach((p) => s.delete(p.id)); else paged.forEach((p) => s.add(p.id)); setSelected(s); }
  function toggleOne(id: string) { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); }
  function onSort(key: SortKey) { setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })); }
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  function openEdit(p: Product) {
    setForm({
      id: p.id, code: p.code, name: p.name, unit: p.unit || "",
      giaMua: toNum(p.giaMua) == null ? "" : String(toNum(p.giaMua)),
      haoHut: String(toNum(p.haoHut) ?? 0), vanChuyen: String(toNum(p.vanChuyen) ?? 0),
      status: p.status || "ACTIVE", note: p.note || "",
    });
  }
  async function save() {
    if (!form?.code) return toast.error("Nhập mã sản phẩm (MA_SP)");
    if (!form?.name) return toast.error("Nhập tên sản phẩm (TEN_SP)");
    const editing = !!form.id;
    try {
      if (form.id) await patchJSON(`/api/products/${form.id}`, form);
      else await postJSON("/api/products", form);
      setForm(null); await load();
      toast.success(editing ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm");
    } catch (e) { toast.error((e as Error).message); }
  }
  function del(p: Product) {
    setPending({ text: `Xóa sản phẩm "${p.name}" (${p.code})?`, run: async () => { await sendJSON("DELETE", `/api/products/${p.id}`); await load(); toast.success("Đã xóa sản phẩm"); } });
  }
  function delSelected() {
    if (selected.size === 0) return;
    const ids = [...selected];
    setPending({ text: `Xóa ${ids.length} sản phẩm đã chọn?`, run: async () => { await Promise.all(ids.map((id) => sendJSON("DELETE", `/api/products/${id}`))); setSelected(new Set()); await load(); toast.success(`Đã xóa ${ids.length} sản phẩm`); } });
  }
  async function runPending() {
    if (!pending) return;
    setErr("");
    try { await pending.run(); setPending(null); }
    catch (e) { toast.error((e as Error).message); setPending(null); }
  }
  function exportCsv() {
    const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ["MA_SP", "TEN_SP", "DON_VI", "GIA_MUA", "HAO_HUT", "VAN_CHUYEN", "GIA_FINAL", "STATUS", "GHI_CHU"];
    const rows = view.map((p) => [p.code, p.name, p.unit || "", toNum(p.giaMua) ?? "", toNum(p.haoHut) ?? 0, toNum(p.vanChuyen) ?? 0, toNum(p.giaFinal) ?? "", p.status, p.note || ""]);
    const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "san-pham.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const previewFinal = form ? calcFinal(form.giaMua, form.haoHut, form.vanChuyen) : null;
  const cols: { key: SortKey; label: string; right?: boolean }[] = [
    { key: "code", label: "Mã SP" }, { key: "name", label: "Tên sản phẩm" }, { key: "unit", label: "ĐVT" },
    { key: "giaMua", label: "Giá mua", right: true }, { key: "haoHut", label: "Hao hụt", right: true },
    { key: "vanChuyen", label: "Vận chuyển", right: true }, { key: "giaFinal", label: "Giá final", right: true },
    { key: "status", label: "Trạng thái" },
  ];

  return (
    <div>
      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      {/* Thanh công cụ kiểu Ecount */}
      <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap")}>
        <div style={sx("position:relative; width:260px")}>
          <span style={sx("position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0")}>🔍</span>
          <HInput s={`${inp} height:34px; padding-left:32px`} focus={focus} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm mã hoặc tên sản phẩm..." />
        </div>
        <div style={sx("font-size:12.5px; color:#7B8A80")}>{view.length} sản phẩm{selected.size ? ` · chọn ${selected.size}` : ""}</div>
        <div style={sx("flex:1")} />
        <HButton s={`${ghost} ${selected.size ? "" : "opacity:.5; pointer-events:none"}; border-color:#E4C7C5; color:#B3261E`} onClick={delSelected}>🗑 Xóa đã chọn</HButton>
        <HButton s={ghost} onClick={exportCsv}>⭳ Excel</HButton>
        <HButton s={green} onClick={() => setForm(empty())}>+ Thêm sản phẩm</HButton>
      </div>

      {/* Lưới sản phẩm */}
      <div style={sx("background:#fff; border:1px solid #D3DCE3; border-radius:10px; overflow:auto; max-height:calc(100vh - 200px)")}>
        <table style={sx("width:100%; border-collapse:collapse; min-width:1000px")}>
          <thead>
            <tr>
              <th style={sx(gth + "; width:38px; text-align:center")}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} style={sx("cursor:pointer")} />
              </th>
              <th style={sx(gth + "; width:44px; text-align:center")}>No.</th>
              {cols.map((c) => (
                <th key={c.key} onClick={() => onSort(c.key)} style={sx(gth + `; cursor:pointer${c.right ? "; text-align:right" : ""}`)} title="Bấm để sắp xếp">
                  {c.label}<span style={sx("color:#1F7440")}>{arrow(c.key)}</span>
                </th>
              ))}
              <th style={sx(gth)}>Ghi chú</th>
              <th style={sx(gth + "; width:110px; text-align:center")}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr><td colSpan={12} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:24px")}>Không có sản phẩm nào.</td></tr>
            )}
            {paged.map((p, i) => {
              const soldOut = toNum(p.giaMua) == null;
              const on = selected.has(p.id);
              return (
                <tr key={p.id} style={sx(`background:${on ? "#EAF3EC" : i % 2 ? "#FBFDFB" : "#fff"}`)}>
                  <td style={sx(gtd + "; text-align:center")}><input type="checkbox" checked={on} onChange={() => toggleOne(p.id)} style={sx("cursor:pointer")} /></td>
                  <td style={sx(gtd + "; text-align:center; color:#8B9A90")}>{(curPage - 1) * 15 + i + 1}</td>
                  <td style={sx(gtd + "; font-weight:700; color:#1F7440; cursor:pointer; text-decoration:underline")} onClick={() => setDetail(p)} title="Xem chi tiết">{p.code}</td>
                  <td style={sx(gtd + "; min-width:170px")} title={p.name}>{p.name}</td>
                  <td style={sx(gtd + "; text-align:center")}>{p.unit || "—"}</td>
                  <td style={sx(gtd + "; text-align:right")}>{soldOut ? <span style={sx("color:#B3261E; font-weight:600")}>Hết hàng</span> : vnd(p.giaMua)}</td>
                  <td style={sx(gtd + "; text-align:right")}>{toNum(p.haoHut) ?? 0}%</td>
                  <td style={sx(gtd + "; text-align:right")}>{vnd(p.vanChuyen)}</td>
                  <td style={sx(gtd + "; text-align:right; font-weight:700")}>{soldOut ? "—" : vnd(p.giaFinal)}</td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${p.status === "ACTIVE" ? "#E7F5EC" : "#FDECEC"}; color:${p.status === "ACTIVE" ? "#1F7440" : "#B3261E"}`)}>{p.status}</span>
                  </td>
                  <td style={sx(gtd + "; min-width:130px; color:#7B8A80")} title={p.note || ""}>{p.note || "—"}</td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <div style={sx("display:flex; gap:6px; justify-content:center")}>
                      <HButton s="border:1px solid #DCE3DC; border-radius:6px; background:#fff; color:#33475B; font-size:12px; font-weight:600; cursor:pointer; padding:0 9px; height:28px" onClick={() => openEdit(p)}>Sửa</HButton>
                      <HButton s="width:28px; height:28px; border:1px solid #E4C7C5; border-radius:6px; background:#fff; color:#B3261E; cursor:pointer" title="Xóa" onClick={() => del(p)}>🗑</HButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={sx("display:flex; align-items:center; gap:8px; margin-top:10px")}>
        <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>Trang {curPage}/{totalPages} · {view.length} sản phẩm</div>
        <HButton s={`${ghost} ${curPage <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage - 1)}>‹ Trước</HButton>
        <HButton s={`${ghost} ${curPage >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage + 1)}>Sau ›</HButton>
      </div>
      <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Giá final = Giá mua × (1 + Hao hụt%) + Vận chuyển — tự tính. Bấm mã SP để xem chi tiết, bấm tiêu đề cột để sắp xếp.</div>

      {/* Modal thêm/sửa */}
      {form && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setForm(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:480px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:16px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>{form.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setForm(null)}>✕</HButton>
            </div>
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("width:150px")}><Field label="Mã SP *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BO034" /></div>
              <div style={sx("flex:1")}><Field label="Đơn vị" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="KG" /></div>
            </div>
            <Field label="Tên sản phẩm *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BƠ 034" />
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1")}><Field label="Giá mua (trống = hết hàng)" value={form.giaMua} onChange={(e) => setForm({ ...form, giaMua: e.target.value })} placeholder="36000" /></div>
              <div style={sx("width:90px")}><Field label="Hao hụt %" value={form.haoHut} onChange={(e) => setForm({ ...form, haoHut: e.target.value })} placeholder="5" /></div>
            </div>
            <div style={sx("display:flex; gap:10px; align-items:flex-end")}>
              <div style={sx("flex:1")}><Field label="Vận chuyển" value={form.vanChuyen} onChange={(e) => setForm({ ...form, vanChuyen: e.target.value })} placeholder="2000" /></div>
              <div style={sx("flex:1")}>
                <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
                  <span style={sx(lbl)}>Giá final (tự tính)</span>
                  <div style={sx("height:40px; display:flex; align-items:center; padding:0 11px; border-radius:9px; background:#EAF3EC; font-size:15px; font-weight:700; color:#1F7440")}>{previewFinal == null ? "—" : previewFinal.toLocaleString("vi-VN")}</div>
                </label>
              </div>
            </div>
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("width:140px")}>
                <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
                  <span style={sx(lbl)}>Trạng thái</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={sx(inp)}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
              </div>
              <div style={sx("flex:1")}><Field label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Giá mua trái" /></div>
            </div>
            <div style={sx("display:flex; gap:10px; margin-top:6px")}>
              <HButton s={`${green} flex:1; height:44px`} onClick={save}>{form.id ? "Lưu thay đổi" : "Thêm sản phẩm"}</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setForm(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {pending && (
        <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setPending(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:420px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("font-size:17px; font-weight:700; color:#14261A; margin-bottom:8px")}>Xác nhận xóa</div>
            <div style={sx("font-size:13.5px; line-height:1.55; color:#4A5A4E; margin-bottom:18px")}>{pending.text} Không thể hoàn tác.</div>
            <div style={sx("display:flex; gap:10px")}>
              <HButton s="flex:1; height:44px; border:none; border-radius:11px; background:#B3261E; color:#fff; font-size:14px; font-weight:600; cursor:pointer" onClick={runPending}>Xóa</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setPending(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết */}
      {detail && (() => {
        const soldOut = toNum(detail.giaMua) == null;
        const rows: [string, React.ReactNode][] = [
          ["Mã SP", detail.code], ["Tên sản phẩm", detail.name], ["Đơn vị", detail.unit || "—"],
          ["Giá mua", soldOut ? <span style={sx("color:#B3261E; font-weight:600")}>Hết hàng</span> : vnd(detail.giaMua)],
          ["Hao hụt", `${toNum(detail.haoHut) ?? 0}%`], ["Vận chuyển", vnd(detail.vanChuyen)],
          ["Giá final", soldOut ? "—" : vnd(detail.giaFinal)],
          ["Trạng thái", detail.status], ["Ghi chú", detail.note || "—"],
        ];
        return (
          <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
            <div onClick={() => setDetail(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
            <div style={sx("position:relative; width:100%; max-width:440px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
              <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
                <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Chi tiết sản phẩm</div>
                <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setDetail(null)}>✕</HButton>
              </div>
              <div style={sx("border:1px solid #E9EEE9; border-radius:12px; overflow:hidden")}>
                {rows.map(([k, v], idx) => (
                  <div key={k} style={sx(`display:flex; font-size:13px; ${idx ? "border-top:1px solid #EFF3EF" : ""}`)}>
                    <div style={sx("width:130px; flex-shrink:0; padding:9px 12px; background:#F7FAF7; color:#6B7A70; font-weight:600")}>{k}</div>
                    <div style={sx("flex:1; padding:9px 12px; color:#14261A")}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={sx("display:flex; gap:10px; margin-top:16px")}>
                <HButton s={`${green} flex:1; height:42px`} onClick={() => { openEdit(detail); setDetail(null); }}>Sửa</HButton>
                <HButton s={`${ghost} height:42px`} onClick={() => setDetail(null)}>Đóng</HButton>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
