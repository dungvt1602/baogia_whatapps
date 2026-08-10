"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON, sendJSON } from "@/components/common/api";

type Customer = {
  id: string;
  name: string;
  whatsappPhone: string | null;
  phone: string | null;
  email: string | null;
  market: string | null;
  status: string;
  receiveQuotation: boolean;
  templates: { id: string; name: string }[];
};
type Form = { id?: string; name: string; whatsappPhone: string; phone: string; email: string; market: string; status: string; receiveQuotation: boolean };
type SortKey = "name" | "whatsappPhone" | "phone" | "email" | "market" | "status";

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:8px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 13px; height:34px;";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";

// Lưới kiểu Ecount (giống màn Sản phẩm).
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; user-select:none; text-align:left; position:sticky; top:0";
const gtd = "padding:6px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; white-space:nowrap; background:inherit";

const empty = (): Form => ({ name: "", whatsappPhone: "", phone: "", email: "", market: "", status: "ACTIVE", receiveQuotation: true });

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
      <span style={sx(lbl)}>{label}</span>
      <HInput s={inp} focus={focus} value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

export default function CustomersScreen() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<{ text: string; run: () => Promise<void> } | null>(null); // xác nhận xóa
  const [detail, setDetail] = useState<Customer | null>(null); // xem chi tiết
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

  const [market, setMarket] = useState("");            // lọc theo quốc gia (server-side)
  const [markets, setMarkets] = useState<string[]>([]); // danh sách quốc gia cho dropdown

  const load = useCallback(async () => {
    try {
      const qs = market ? `?market=${encodeURIComponent(market)}` : "";
      setRows(await getJSON<Customer[]>(`/api/customers${qs}`));
    } catch (e) { setErr((e as Error).message); }
  }, [market]);
  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  // Tải danh sách quốc gia (1 lần) cho dropdown lọc.
  useEffect(() => {
    (async () => {
      try { setMarkets(await getJSON<string[]>("/api/customers/markets")); } catch { /* bỏ qua */ }
    })();
  }, []);

  const view = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const arr = rows.filter((c) => !kw || [c.name, c.whatsappPhone, c.phone, c.email, c.market].some((v) => (v || "").toLowerCase().includes(kw)));
    arr.sort((a, b) => {
      const va = String((a as unknown as Record<string, unknown>)[sort.key] ?? "").toLowerCase();
      const vb = String((b as unknown as Record<string, unknown>)[sort.key] ?? "").toLowerCase();
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
    return sort.dir === "desc" ? arr.reverse() : arr;
  }, [rows, q, sort]);

  const totalPages = Math.max(1, Math.ceil(view.length / 15));
  const curPage = Math.min(page, totalPages);
  const paged = view.slice((curPage - 1) * 15, curPage * 15);

  const allChecked = paged.length > 0 && paged.every((c) => selected.has(c.id));
  function toggleAll() { const s = new Set(selected); if (allChecked) paged.forEach((c) => s.delete(c.id)); else paged.forEach((c) => s.add(c.id)); setSelected(s); }
  function toggleOne(id: string) { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); }
  function onSort(key: SortKey) { setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })); }
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  function openEdit(c: Customer) {
    setForm({ id: c.id, name: c.name, whatsappPhone: c.whatsappPhone || "", phone: c.phone || "", email: c.email || "", market: c.market || "", status: c.status || "ACTIVE", receiveQuotation: c.receiveQuotation });
  }
  async function save() {
    if (!form?.name) return setErr("Nhập tên khách hàng");
    setErr("");
    try {
      if (form.id) await patchJSON(`/api/customers/${form.id}`, form);
      else await postJSON("/api/customers", form);
      setForm(null); await load();
    } catch (e) { setErr((e as Error).message); }
  }
  function del(c: Customer) {
    setPending({ text: `Xóa khách hàng "${c.name}"?`, run: async () => { await sendJSON("DELETE", `/api/customers/${c.id}`); await load(); } });
  }
  function delSelected() {
    if (selected.size === 0) return;
    const ids = [...selected];
    setPending({ text: `Xóa ${ids.length} khách hàng đã chọn?`, run: async () => { await Promise.all(ids.map((id) => sendJSON("DELETE", `/api/customers/${id}`))); setSelected(new Set()); await load(); } });
  }
  async function runPending() {
    if (!pending) return;
    setErr("");
    try { await pending.run(); setPending(null); }
    catch (e) { setErr((e as Error).message); setPending(null); }
  }
  function exportCsv() {
    const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ["TEN_KHACH", "WHATSAPP", "SDT", "EMAIL", "THI_TRUONG", "NHAN_BAO_GIA", "TRANG_THAI", "TEMPLATE"];
    const data = view.map((c) => [c.name, c.whatsappPhone || "", c.phone || "", c.email || "", c.market || "", c.receiveQuotation ? "Có" : "Không", c.status, c.templates.map((t) => t.name).join("; ") || "Kho"]);
    const csv = [head, ...data].map((r) => r.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "khach-hang.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Tên khách" }, { key: "whatsappPhone", label: "WhatsApp" }, { key: "phone", label: "SĐT" },
    { key: "email", label: "Email" }, { key: "market", label: "Thị trường" }, { key: "status", label: "Trạng thái" },
  ];

  return (
    <div>
      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap")}>
        <div style={sx("position:relative; width:260px")}>
          <span style={sx("position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0")}>🔍</span>
          <HInput s={`${inp} height:34px; padding-left:32px`} focus={focus} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm tên, SĐT, email..." />
        </div>
        <select value={market} onChange={(e) => { setMarket(e.target.value); setPage(1); }} style={sx(`${inp} height:34px; width:190px; padding:0 8px`)} title="Lọc theo quốc gia">
          <option value="">🌏 Tất cả quốc gia</option>
          {markets.map((mk) => <option key={mk} value={mk}>{mk}</option>)}
        </select>
        <div style={sx("font-size:12.5px; color:#7B8A80")}>{view.length} khách hàng{selected.size ? ` · chọn ${selected.size}` : ""}</div>
        <div style={sx("flex:1")} />
        <HButton s={`${ghost} ${selected.size ? "" : "opacity:.5; pointer-events:none"}; border-color:#E4C7C5; color:#B3261E`} onClick={delSelected}>🗑 Xóa đã chọn</HButton>
        <HButton s={ghost} onClick={exportCsv}>⭳ Excel</HButton>
        <HButton s={green} onClick={() => setForm(empty())}>+ Thêm khách hàng</HButton>
      </div>

      <div style={sx("background:#fff; border:1px solid #D3DCE3; border-radius:10px; overflow:auto; max-height:calc(100vh - 200px)")}>
        <table style={sx("width:100%; border-collapse:collapse; min-width:1040px")}>
          <thead>
            <tr>
              <th style={sx(gth + "; width:38px; text-align:center")}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} style={sx("cursor:pointer")} />
              </th>
              <th style={sx(gth + "; width:44px; text-align:center")}>No.</th>
              {cols.map((c) => (
                <th key={c.key} onClick={() => onSort(c.key)} style={sx(gth + "; cursor:pointer")} title="Bấm để sắp xếp">
                  {c.label}<span style={sx("color:#1F7440")}>{arrow(c.key)}</span>
                </th>
              ))}
              <th style={sx(gth + "; text-align:center")}>Nhận báo giá</th>
              <th style={sx(gth)}>Template</th>
              <th style={sx(gth + "; width:110px; text-align:center")}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr><td colSpan={11} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:24px")}>Không có khách hàng nào.</td></tr>
            )}
            {paged.map((c, i) => {
              const on = selected.has(c.id);
              return (
                <tr key={c.id} style={sx(`background:${on ? "#EAF3EC" : i % 2 ? "#FBFDFB" : "#fff"}`)}>
                  <td style={sx(gtd + "; text-align:center")}><input type="checkbox" checked={on} onChange={() => toggleOne(c.id)} style={sx("cursor:pointer")} /></td>
                  <td style={sx(gtd + "; text-align:center; color:#8B9A90")}>{(curPage - 1) * 15 + i + 1}</td>
                  <td style={sx(gtd + "; font-weight:600; min-width:150px; color:#1F7440; cursor:pointer; text-decoration:underline")} onClick={() => setDetail(c)} title="Xem chi tiết">{c.name}</td>
                  <td style={sx(gtd)}>{c.whatsappPhone || "—"}</td>
                  <td style={sx(gtd)}>{c.phone || "—"}</td>
                  <td style={sx(gtd + "; min-width:150px")} title={c.email || ""}>{c.email || "—"}</td>
                  <td style={sx(gtd)}>{c.market || "—"}</td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${c.status === "ACTIVE" ? "#E7F5EC" : "#FDECEC"}; color:${c.status === "ACTIVE" ? "#1F7440" : "#B3261E"}`)}>{c.status}</span>
                  </td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${c.receiveQuotation ? "#E7F5EC" : "#F1F4F1"}; color:${c.receiveQuotation ? "#1F7440" : "#8B9A90"}`)}>{c.receiveQuotation ? "Có" : "Không"}</span>
                  </td>
                  <td style={sx(gtd + "; color:#7B8A80")} title={c.templates.map((t) => t.name).join(", ") || "Kho"}>{c.templates.length ? c.templates.map((t) => t.name).join(", ") : <span style={sx("color:#9AA7A0")}>Kho</span>}</td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <div style={sx("display:flex; gap:6px; justify-content:center")}>
                      <HButton s="border:1px solid #DCE3DC; border-radius:6px; background:#fff; color:#33475B; font-size:12px; font-weight:600; cursor:pointer; padding:0 9px; height:28px" onClick={() => openEdit(c)}>Sửa</HButton>
                      <HButton s="width:28px; height:28px; border:1px solid #E4C7C5; border-radius:6px; background:#fff; color:#B3261E; cursor:pointer" title="Xóa" onClick={() => del(c)}>🗑</HButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={sx("display:flex; align-items:center; gap:8px; margin-top:10px")}>
        <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>Trang {curPage}/{totalPages} · {view.length} khách hàng</div>
        <HButton s={`${ghost} ${curPage <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage - 1)}>‹ Trước</HButton>
        <HButton s={`${ghost} ${curPage >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage + 1)}>Sau ›</HButton>
      </div>
      <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Gán khách vào template ở menu Template (kéo-thả). Bấm tên khách để xem chi tiết, bấm tiêu đề cột để sắp xếp.</div>

      {form && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setForm(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:480px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:16px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>{form.id ? "Sửa khách hàng" : "Thêm khách hàng"}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setForm(null)}>✕</HButton>
            </div>
            <Field label="Tên khách hàng *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fresh Orient Co." />
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1")}><Field label="Số WhatsApp" value={form.whatsappPhone} onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })} placeholder="84901234001" /></div>
              <div style={sx("flex:1")}><Field label="SĐT khác" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Tuỳ chọn" /></div>
            </div>
            <Field label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="buyer@company.com" />
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1")}><Field label="Thị trường" value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} placeholder="INDIA" /></div>
              <div style={sx("width:140px")}>
                <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
                  <span style={sx(lbl)}>Trạng thái</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={sx(inp)}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
              </div>
            </div>
            <label style={sx("display:flex; align-items:center; gap:8px; margin-bottom:14px; cursor:pointer; font-size:13.5px; color:#3C4A40")}>
              <input type="checkbox" checked={form.receiveQuotation} onChange={(e) => setForm({ ...form, receiveQuotation: e.target.checked })} style={sx("cursor:pointer; width:16px; height:16px")} />
              Nhận báo giá (chỉ khách ACTIVE + bật mục này mới được gửi)
            </label>
            <div style={sx("display:flex; gap:10px; margin-top:6px")}>
              <HButton s={`${green} flex:1; height:44px`} onClick={save}>{form.id ? "Lưu thay đổi" : "Thêm khách hàng"}</HButton>
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
        const rows: [string, React.ReactNode][] = [
          ["Tên khách", detail.name], ["Số WhatsApp", detail.whatsappPhone || "—"], ["SĐT khác", detail.phone || "—"],
          ["Email", detail.email || "—"], ["Thị trường", detail.market || "—"], ["Trạng thái", detail.status],
          ["Nhận báo giá", detail.receiveQuotation ? "Có" : "Không"], ["Template", detail.templates.map((t) => t.name).join(", ") || "Kho"],
        ];
        return (
          <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
            <div onClick={() => setDetail(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
            <div style={sx("position:relative; width:100%; max-width:440px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
              <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
                <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Chi tiết khách hàng</div>
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
