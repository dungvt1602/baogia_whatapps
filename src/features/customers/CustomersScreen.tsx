"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON, sendJSON } from "@/components/common/api";
import { CountrySelect, PhoneWithDial } from "@/components/common/CountrySelect";
import { applyDial, findCountry, splitPhone } from "@/components/common/countries";
import { createCustomerSchema } from "@/server/validation/customer.schema";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Map cột file (linh hoạt: bỏ dấu/khoảng trắng/hoa-thường) -> field khách hàng.
const normHeader = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["tenkhach", "ten", "name", "hoten", "khachhang", "tenkh"],
  company: ["congty", "company", "cty", "doanhnghiep"],
  whatsappPhone: ["sowhatsapp", "whatsapp", "whatsappphone", "wa", "sdtwhatsapp", "sowa"],
  phone: ["sdtkhac", "sdt", "phone", "dienthoai", "sodienthoai"],
  email: ["email", "mail"],
  market: ["quocgia", "thitruong", "market", "qg", "nuoc"],
  receiveQuotation: ["nhanbaogia", "nhan", "receivequotation", "baogia"],
  note: ["ghichu", "note", "ghichep"],
};
type ImportRow = { name: string; company: string; whatsappPhone: string; phone: string; email: string; market: string; receiveQuotation: boolean; note: string };
function mapImportRow(raw: Record<string, unknown>): ImportRow {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const h = normHeader(key);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(h)) { out[field] = String(val ?? "").trim(); break; }
    }
  }
  const digits = (s?: string) => (s || "").replace(/\D/g, "");
  const truthy = (s?: string) => {
    const v = normHeader(s);
    if (["khong", "no", "false", "0"].includes(v)) return false;
    return true; // mặc định nhận báo giá
  };
  return {
    name: out.name || "",
    company: out.company || "",
    whatsappPhone: digits(out.whatsappPhone),
    phone: digits(out.phone),
    email: out.email || "",
    market: out.market || "",
    receiveQuotation: truthy(out.receiveQuotation),
    note: out.note || "",
  };
}
// Parse 1 sheet -> mảng ImportRow (bỏ dòng không có tên lẫn WhatsApp).
function parseSheetRows(wb: XLSX.WorkBook, sheet: string): ImportRow[] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return raw.map(mapImportRow).filter((r) => r.name || r.whatsappPhone);
}
// Tự dò sheet nào có cột tên + WhatsApp (chọn mặc định khi file nhiều tab).
function detectCustomerSheet(wb: XLSX.WorkBook): string {
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], { defval: "" });
    if (!rows.length) continue;
    const headers = Object.keys(rows[0]).map(normHeader);
    if (headers.some((h) => HEADER_ALIASES.name.includes(h)) && headers.some((h) => HEADER_ALIASES.whatsappPhone.includes(h))) return name;
  }
  return wb.SheetNames[0];
}

type Customer = {
  id: string;
  name: string;
  company: string | null;
  whatsappPhone: string | null;
  phone: string | null;
  email: string | null;
  market: string | null;
  status: string;
  receiveQuotation: boolean;
  note: string | null;
  templates: { id: string; name: string }[];
};
type Form = { id?: string; name: string; company: string; whatsappPhone: string; phone: string; email: string; market: string; status: string; receiveQuotation: boolean; note: string };
type SortKey = "name" | "company" | "whatsappPhone" | "phone" | "email" | "market" | "status";

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:8px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 13px; height:34px;";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";

// Lưới kiểu Ecount (giống màn Sản phẩm).
const gth = "padding:6px 8px; font-size:11px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; user-select:none; text-align:left; position:sticky; top:0";
const gtd = "padding:5px 8px; font-size:12px; color:#1B2A20; border:1px solid #E4EAEF; white-space:nowrap; background:inherit";

const empty = (): Form => ({ name: "", company: "", whatsappPhone: "", phone: "", email: "", market: "", status: "ACTIVE", receiveQuotation: true, note: "" });

// Hiển thị số WhatsApp: tách mã vùng dạng "(+84) 901234002".
const fmtWa = (phone: string | null, market: string | null) => {
  if (!phone) return "—";
  const { dial, local } = splitPhone(phone, market);
  return dial ? `(+${dial}) ${local}` : phone;
};
// Ô Thị trường: pill mã quốc gia (không dùng cờ emoji vì Windows render thành chữ, bị "IN IN").
function MarketCell({ market }: { market: string | null }) {
  if (!market) return <span style={sx("color:#9AA7A0")}>—</span>;
  const c = findCountry(market);
  return (
    <span
      title={c ? c.name : market}
      style={sx("display:inline-flex; align-items:center; background:#EAF3EC; border:1px solid #D9E7DD; border-radius:20px; padding:2px 11px; font-size:12px; font-weight:700; color:#1F7440; letter-spacing:.03em")}
    >
      {c ? c.iso2 : market}
    </span>
  );
}

function Field({ label, value, onChange, placeholder, error }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; error?: string }) {
  return (
    <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
      <span style={sx(lbl)}>{label}</span>
      <HInput s={error ? inp + "; border-color:#E4746E" : inp} focus={focus} value={value} onChange={onChange} placeholder={placeholder} />
      {error && <span style={sx("font-size:11.5px; color:#B3261E; margin-top:4px")}>{error}</span>}
    </label>
  );
}

export default function CustomersScreen() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<{ text: string; run: () => Promise<void> } | null>(null); // xác nhận xóa
  const [importFile, setImportFile] = useState<{ wb: XLSX.WorkBook; sheetNames: string[]; sheet: string; fileName: string } | null>(null); // xem trước nhập
  const [importing, setImporting] = useState(false);
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

  // Chuẩn hoá danh sách quốc gia cho dropdown lọc: gộp trùng (INDIA/India/KOREA...) + tên chuẩn.
  const marketOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    for (const raw of markets) {
      if (!raw) continue;
      const c = findCountry(raw);
      const key = c ? c.iso2 : raw.toLowerCase();
      if (!map.has(key)) map.set(key, { value: raw, label: c ? c.name : raw });
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [markets]);

  const totalPages = Math.max(1, Math.ceil(view.length / 15));
  const curPage = Math.min(page, totalPages);
  const paged = view.slice((curPage - 1) * 15, curPage * 15);

  const allChecked = paged.length > 0 && paged.every((c) => selected.has(c.id));
  function toggleAll() { const s = new Set(selected); if (allChecked) paged.forEach((c) => s.delete(c.id)); else paged.forEach((c) => s.add(c.id)); setSelected(s); }
  function toggleOne(id: string) { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); }
  function onSort(key: SortKey) { setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })); }
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  function openEdit(c: Customer) {
    setErrors({}); setErr("");
    setForm({ id: c.id, name: c.name, company: c.company || "", whatsappPhone: c.whatsappPhone || "", phone: c.phone || "", email: c.email || "", market: c.market || "", status: c.status || "ACTIVE", receiveQuotation: c.receiveQuotation, note: c.note || "" });
  }
  function openAdd() { setErrors({}); setErr(""); setForm(empty()); }
  async function save() {
    if (!form) return;
    const parsed = createCustomerSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) { const k = String(issue.path[0]); if (!errs[k]) errs[k] = issue.message; }
      setErrors(errs); setErr("");
      return;
    }
    setErrors({}); setErr("");
    const editing = !!form.id;
    try {
      if (form.id) await patchJSON(`/api/customers/${form.id}`, form);
      else await postJSON("/api/customers", form);
      setForm(null); await load();
      toast.success(editing ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng");
    } catch (e) { toast.error((e as Error).message); }
  }
  function del(c: Customer) {
    setPending({ text: `Xóa khách hàng "${c.name}"?`, run: async () => { await sendJSON("DELETE", `/api/customers/${c.id}`); await load(); toast.success("Đã xóa khách hàng"); } });
  }
  function delSelected() {
    if (selected.size === 0) return;
    const ids = [...selected];
    setPending({ text: `Xóa ${ids.length} khách hàng đã chọn?`, run: async () => { await Promise.all(ids.map((id) => sendJSON("DELETE", `/api/customers/${id}`))); setSelected(new Set()); await load(); toast.success(`Đã xóa ${ids.length} khách hàng`); } });
  }
  async function runPending() {
    if (!pending) return;
    setErr("");
    try { await pending.run(); setPending(null); }
    catch (e) { toast.error((e as Error).message); setPending(null); }
  }
  // Tải file mẫu .xlsx (đúng cột) để khách điền rồi nhập lại.
  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Tên khách", "Công ty", "Số WhatsApp", "SĐT khác", "Email", "Quốc gia", "Nhận báo giá"],
      ["Nguyễn Văn A", "Công ty ABC", "84901234567", "", "a@abc.com", "VN", "Có"],
      ["Mai Khôi", "Cty XYZ", "84332777154", "", "", "IN", "Có"],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KhachHang");
    XLSX.writeFile(wb, "mau-khach-hang.xlsx");
  }

  // Đọc file .xlsx/.csv -> lưu workbook, tự chọn sheet có cột khách -> mở xem trước.
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset để chọn lại cùng file được
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      if (!wb.SheetNames.length) return toast.error("File không có sheet nào.");
      setImportFile({ wb, sheetNames: wb.SheetNames, sheet: detectCustomerSheet(wb), fileName: file.name });
    } catch {
      toast.error("Không đọc được file. Cần .xlsx, .xls hoặc .csv.");
    }
  }

  async function doImport() {
    if (!importFile) return;
    const rows = parseSheetRows(importFile.wb, importFile.sheet);
    if (rows.length === 0) return toast.error("Sheet này không có dòng khách nào.");
    setImporting(true);
    try {
      const res = await postJSON<{ created: number; skippedDup: number; invalid: { row: number; reason: string }[] }>("/api/customers/import", { rows });
      setImportFile(null);
      await load();
      const parts = [`Đã thêm ${res.created} khách`];
      if (res.skippedDup) parts.push(`bỏ ${res.skippedDup} trùng`);
      if (res.invalid.length) parts.push(`${res.invalid.length} dòng lỗi`);
      toast.success(parts.join(" · "));
      if (res.invalid.length) console.warn("[import] dòng lỗi:", res.invalid);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function exportCsv() {
    const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ["TEN_KHACH", "CONG_TY", "WHATSAPP", "SDT", "EMAIL", "THI_TRUONG", "NHAN_BAO_GIA", "TRANG_THAI", "GHI_CHU", "TEMPLATE"];
    const data = view.map((c) => [c.name, c.company || "", c.whatsappPhone || "", c.phone || "", c.email || "", c.market || "", c.receiveQuotation ? "Có" : "Không", c.status, c.note || "", c.templates.map((t) => t.name).join("; ") || "Kho"]);
    const csv = [head, ...data].map((r) => r.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "khach-hang.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Tên khách" }, { key: "company", label: "Công ty" }, { key: "whatsappPhone", label: "WhatsApp" }, { key: "phone", label: "SĐT" },
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
          {marketOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={sx("font-size:12.5px; color:#7B8A80")}>{view.length} khách hàng{selected.size ? ` · chọn ${selected.size}` : ""}</div>
        <div style={sx("flex:1")} />
        <HButton s={`${ghost} ${selected.size ? "" : "opacity:.5; pointer-events:none"}; border-color:#E4C7C5; color:#B3261E`} onClick={delSelected}>🗑 Xóa đã chọn</HButton>
        <HButton s={ghost} onClick={downloadTemplate}>⭳ Mẫu</HButton>
        <label style={sx(ghost + "; display:inline-flex; align-items:center; gap:4px")} title="Nhập từ file Excel/CSV">
          ⭱ Nhập Excel
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onImportFile} style={sx("display:none")} />
        </label>
        <HButton s={ghost} onClick={exportCsv}>⭳ Excel</HButton>
        <HButton s={green} onClick={openAdd}>+ Thêm khách hàng</HButton>
      </div>

      <div style={sx("background:#fff; border:1px solid #D3DCE3; border-radius:10px; overflow:auto; max-height:calc(100vh - 200px)")}>
        <table style={sx("width:100%; border-collapse:collapse; min-width:900px")}>
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
                  <td style={sx(gtd + "; font-weight:600; max-width:170px; overflow:hidden; text-overflow:ellipsis; color:#1F7440; cursor:pointer; text-decoration:underline")} onClick={() => setDetail(c)} title={c.name}>{c.name}</td>
                  <td style={sx(gtd + "; max-width:160px; overflow:hidden; text-overflow:ellipsis")} title={c.company || ""}>{c.company || "—"}</td>
                  <td style={sx(gtd + "; font-variant-numeric:tabular-nums")} title={c.whatsappPhone || ""}>{fmtWa(c.whatsappPhone, c.market)}</td>
                  <td style={sx(gtd)}>{c.phone || "—"}</td>
                  <td style={sx(gtd + "; max-width:180px; overflow:hidden; text-overflow:ellipsis")} title={c.email || ""}>{c.email || "—"}</td>
                  <td style={sx(gtd)}><MarketCell market={c.market} /></td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${c.status === "ACTIVE" ? "#E7F5EC" : "#FDECEC"}; color:${c.status === "ACTIVE" ? "#1F7440" : "#B3261E"}`)}>{c.status}</span>
                  </td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${c.receiveQuotation ? "#E7F5EC" : "#F1F4F1"}; color:${c.receiveQuotation ? "#1F7440" : "#8B9A90"}`)}>{c.receiveQuotation ? "Có" : "Không"}</span>
                  </td>
                  <td style={sx(gtd + "; color:#7B8A80; max-width:220px; overflow:hidden; text-overflow:ellipsis")} title={c.templates.map((t) => t.name).join(", ") || "Kho"}>{c.templates.length ? c.templates.map((t) => t.name).join(", ") : <span style={sx("color:#9AA7A0")}>Kho</span>}</td>
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
        <div style={sx("display:flex; align-items:center; gap:5px; font-size:12.5px; color:#7B8A80")}>
          <span>Đến trang</span>
          <input
            type="number" min={1} max={totalPages} key={curPage} defaultValue={curPage}
            onKeyDown={(e) => { if (e.key === "Enter") { const n = Number((e.target as HTMLInputElement).value); if (n) setPage(Math.min(Math.max(1, Math.floor(n)), totalPages)); } }}
            style={sx("height:32px; width:58px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:8px; padding:0 6px; font-size:13px; text-align:center; color:#14261A; outline:none")}
            title="Gõ số trang rồi Enter"
          />
          <span>/ {totalPages}</span>
        </div>
        <HButton s={`${ghost} ${curPage <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(1)} title="Trang đầu">« Đầu</HButton>
        <HButton s={`${ghost} ${curPage <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage - 1)}>‹ Trước</HButton>
        <HButton s={`${ghost} ${curPage >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage + 1)}>Sau ›</HButton>
        <HButton s={`${ghost} ${curPage >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(totalPages)} title="Trang cuối">Cuối »</HButton>
      </div>
      <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Gán khách vào template ở menu Template (kéo-thả). Bấm tên khách để xem chi tiết, bấm tiêu đề cột để sắp xếp.</div>

      {form && (
        <div style={sx("position:fixed; inset:0; z-index:60; overflow:auto; padding:28px 16px")}>
          <div onClick={() => setForm(null)} style={sx("position:fixed; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; z-index:1; width:100%; max-width:480px; margin:0 auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:18px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>{form.id ? "Sửa khách hàng" : "Thêm khách hàng"}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setForm(null)}>✕</HButton>
            </div>

            <Field label="Tên khách hàng *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fresh Orient Co." error={errors.name} />
            <Field label="Công ty" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="VD: Ago Group" />

            {/* Quốc gia trước -> tự set sẵn mã vùng cho số WhatsApp */}
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1; min-width:0")}>
                <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
                  <span style={sx(lbl)}>Thị trường / Quốc gia</span>
                  <CountrySelect value={form.market} onSelect={(c) => setForm({ ...form, market: c.name, whatsappPhone: applyDial(form.whatsappPhone, c.dial) })} />
                </label>
              </div>
              <div style={sx("width:132px")}>
                <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
                  <span style={sx(lbl)}>Trạng thái</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={sx(inp)}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
              </div>
            </div>

            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1; min-width:0")}>
                <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
                  <span style={sx(lbl)}>Số WhatsApp *</span>
                  <PhoneWithDial dial={findCountry(form.market)?.dial ?? ""} value={form.whatsappPhone} onChange={(v) => setForm({ ...form, whatsappPhone: v })} placeholder="901234001" />
                  {errors.whatsappPhone && <span style={sx("font-size:11.5px; color:#B3261E; margin-top:4px")}>{errors.whatsappPhone}</span>}
                </label>
              </div>
              <div style={sx("flex:1; min-width:0")}><Field label="SĐT khác" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Tuỳ chọn" error={errors.phone} /></div>
            </div>

            <Field label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="buyer@company.com" error={errors.email} />

            <Field label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Tuỳ chọn" />

            <label style={sx("display:flex; align-items:center; gap:8px; margin:2px 0 18px; cursor:pointer; font-size:13.5px; color:#3C4A40")}>
              <input type="checkbox" checked={form.receiveQuotation} onChange={(e) => setForm({ ...form, receiveQuotation: e.target.checked })} style={sx("cursor:pointer; width:16px; height:16px")} />
              Nhận báo giá (chỉ khách ACTIVE + bật mục này mới được gửi)
            </label>

            <div style={sx("display:flex; gap:10px")}>
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

      {/* Modal xem trước NHẬP Excel */}
      {importFile && (() => {
        const rows = parseSheetRows(importFile.wb, importFile.sheet);
        const ok = rows.filter((r) => r.name && r.whatsappPhone.length >= 6 && r.whatsappPhone.length <= 15);
        const bad = rows.length - ok.length;
        return (
          <div style={sx("position:fixed; inset:0; z-index:75; display:flex; align-items:center; justify-content:center; padding:20px")}>
            <div onClick={() => !importing && setImportFile(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
            <div style={sx("position:relative; width:100%; max-width:600px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
              <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:12px")}>
                <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Nhập khách hàng từ file</div>
                <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => !importing && setImportFile(null)}>✕</HButton>
              </div>
              <div style={sx("font-size:13px; color:#4A5A4E; margin-bottom:8px")}>📄 {importFile.fileName}</div>
              {importFile.sheetNames.length > 1 && (
                <label style={sx("display:flex; flex-direction:column; margin-bottom:10px")}>
                  <span style={sx("font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px")}>Chọn sheet (tab) chứa khách hàng</span>
                  <select value={importFile.sheet} onChange={(e) => setImportFile({ ...importFile, sheet: e.target.value })} style={sx(`${inp} height:36px`)}>
                    {importFile.sheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              )}
              <div style={sx("font-size:13px; margin-bottom:12px")}>
                Đọc được <b>{rows.length}</b> dòng · <span style={sx("color:#1F7440; font-weight:600")}>✓ {ok.length} hợp lệ</span>
                {bad > 0 && <span style={sx("color:#B3261E; margin-left:10px")}>⚠ {bad} thiếu tên/WhatsApp (sẽ bỏ qua)</span>}
              </div>
              <div style={sx("border:1px solid #D3DCE3; border-radius:9px; overflow:auto; max-height:40vh")}>
                <table style={sx("width:100%; border-collapse:collapse; min-width:520px")}>
                  <thead><tr>
                    <th style={sx(gth)}>Tên</th><th style={sx(gth)}>Công ty</th><th style={sx(gth)}>WhatsApp</th><th style={sx(gth)}>Quốc gia</th>
                  </tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={4} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:18px")}>Sheet này không có cột tên/WhatsApp. Chọn sheet khác.</td></tr>}
                    {rows.slice(0, 8).map((r, i) => {
                      const valid = r.name && r.whatsappPhone.length >= 6 && r.whatsappPhone.length <= 15;
                      return (
                        <tr key={i} style={sx(`background:${valid ? (i % 2 ? "#FBFDFB" : "#fff") : "#FDECEC"}`)}>
                          <td style={sx(gtd)}>{r.name || <span style={sx("color:#B3261E")}>(thiếu)</span>}</td>
                          <td style={sx(gtd)}>{r.company || "—"}</td>
                          <td style={sx(gtd)}>{r.whatsappPhone || <span style={sx("color:#B3261E")}>(thiếu)</span>}</td>
                          <td style={sx(gtd)}>{r.market || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 8 && <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:6px")}>… và {rows.length - 8} dòng nữa</div>}
              <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Khách trùng số WhatsApp (đã có trong hệ thống hoặc lặp trong file) sẽ tự động bỏ qua.</div>
              <div style={sx("display:flex; gap:10px; margin-top:16px")}>
                <HButton s={`${green} flex:1; height:44px ${ok.length === 0 || importing ? "; opacity:.5; pointer-events:none" : ""}`} onClick={doImport}>{importing ? "Đang nhập..." : `Nhập ${ok.length} khách`}</HButton>
                <HButton s={`${ghost} height:44px ${importing ? "; opacity:.5; pointer-events:none" : ""}`} onClick={() => setImportFile(null)}>Hủy</HButton>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal xem chi tiết */}
      {detail && (() => {
        const rows: [string, React.ReactNode][] = [
          ["Tên khách", detail.name], ["Công ty", detail.company || "—"], ["Số WhatsApp", detail.whatsappPhone || "—"], ["SĐT khác", detail.phone || "—"],
          ["Email", detail.email || "—"], ["Thị trường", detail.market || "—"], ["Trạng thái", detail.status],
          ["Nhận báo giá", detail.receiveQuotation ? "Có" : "Không"], ["Ghi chú", detail.note || "—"], ["Template", detail.templates.map((t) => t.name).join(", ") || "Kho"],
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
