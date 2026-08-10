"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON } from "@/components/common/api";

type CustRow = {
  id: string;
  name: string;
  whatsappPhone: string | null;
  phone: string | null;
  email: string | null;
  market: string | null;
  status: string;
  receiveQuotation: boolean;
  template: { id: string; name: string } | null;
};
type Paged = { items: CustRow[]; total: number; page: number; limit: number };

const LIMIT = 20;

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:8px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 13px; height:34px;";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; user-select:none; text-align:left; position:sticky; top:0";
const gtd = "padding:6px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; white-space:nowrap; background:inherit";

export default function TemplateCustomersScreen({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [tplName, setTplName] = useState("");
  const [data, setData] = useState<Paged | null>(null);
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newC, setNewC] = useState<{ name: string; whatsappPhone: string; market: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search.trim()) p.set("search", search.trim());
      if (market) p.set("market", market);
      setData(await getJSON<Paged>(`/api/customers/search?${p.toString()}`));
    } catch (e) { setErr((e as Error).message); }
  }, [page, search, market]);

  // Nạp danh sách (debounce cho gõ tìm kiếm).
  useEffect(() => {
    const t = setTimeout(() => { (async () => { await load(); })(); }, 200);
    return () => clearTimeout(t);
  }, [load]);

  // Tên template cho tiêu đề + danh sách quốc gia cho dropdown (1 lần).
  useEffect(() => {
    (async () => {
      try { setTplName((await getJSON<{ name: string }>(`/api/templates/${templateId}`)).name); } catch { /* bỏ qua */ }
    })();
    (async () => {
      try { setMarkets(await getJSON<string[]>("/api/customers/markets")); } catch { /* bỏ qua */ }
    })();
  }, [templateId]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const inThis = (r: CustRow) => r.template?.id === templateId;

  const allChecked = items.length > 0 && items.every((r) => selected.has(r.id));
  function toggleAll() { const s = new Set(selected); if (allChecked) items.forEach((r) => s.delete(r.id)); else items.forEach((r) => s.add(r.id)); setSelected(s); }
  function toggleOne(id: string) { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); }

  const assign = useCallback(async (ids: string[], toTemplate: string | null) => {
    if (!ids.length) return;
    setErr(""); setBusy(true);
    try {
      await Promise.all(ids.map((id) => patchJSON(`/api/customers/${id}`, { templateId: toTemplate })));
      setSelected(new Set());
      await load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }, [load]);

  const selectedRows = items.filter((r) => selected.has(r.id));
  const selInThis = selectedRows.filter(inThis).length;   // đang trong template này
  const selOthers = selectedRows.length - selInThis;      // chưa vào template này (kho / template khác)

  async function createNew() {
    if (!newC?.name.trim()) { setErr("Nhập tên khách"); return; }
    setErr(""); setBusy(true);
    try {
      await postJSON(`/api/templates/${templateId}/customers`, { name: newC.name.trim(), whatsappPhone: newC.whatsappPhone.trim(), market: newC.market.trim() || null });
      setNewC(null);
      await load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <HButton s="display:inline-flex; align-items:center; gap:7px; border:none; background:none; color:#2F8F4E; font-size:13.5px; font-weight:600; cursor:pointer; padding:0; margin-bottom:12px" onClick={() => router.push(`/template/${templateId}`)}>‹ Về template</HButton>
      <div style={sx("font-size:20px; font-weight:700; color:#14261A; margin-bottom:2px; letter-spacing:-0.02em")}>Quản lý khách hàng</div>
      <div style={sx("font-size:13px; color:#7B8A80; margin-bottom:14px")}>Template: <b style={sx("color:#1F7440")}>{tplName || "…"}</b> — tick chọn nhiều rồi “Thêm đã chọn”, hoặc bấm Thêm/Gỡ từng dòng.</div>

      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      {/* Thanh công cụ: tìm kiếm + lọc quốc gia + tạo mới */}
      <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap")}>
        <div style={sx("position:relative; width:260px")}>
          <span style={sx("position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0")}>🔍</span>
          <HInput s={`${inp} height:34px; padding-left:32px`} focus={focus} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên, SĐT, email..." />
        </div>
        <select value={market} onChange={(e) => { setMarket(e.target.value); setPage(1); }} style={sx(`${inp} height:34px; width:190px; padding:0 8px`)} title="Lọc theo quốc gia">
          <option value="">🌏 Tất cả quốc gia</option>
          {markets.map((mk) => <option key={mk} value={mk}>{mk}</option>)}
        </select>
        <div style={sx("font-size:12.5px; color:#7B8A80")}>{total} khách{selected.size ? ` · chọn ${selected.size}` : ""}</div>
        <div style={sx("flex:1")} />
        <HButton s={green} onClick={() => setNewC({ name: "", whatsappPhone: "", market: market })}>+ Khách mới</HButton>
      </div>

      {/* Thanh thao tác hàng loạt */}
      {selected.size > 0 && (
        <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px; background:#EAF3EC; border:1px solid #CFE6D5; border-radius:10px; padding:8px 12px; flex-wrap:wrap")}>
          <span style={sx("font-size:13px; color:#1F7440; font-weight:600")}>Đã chọn {selected.size}</span>
          <div style={sx("flex:1")} />
          <HButton s={`${green} ${selOthers ? "" : "opacity:.5; pointer-events:none"}`} onClick={() => assign(selectedRows.filter((r) => !inThis(r)).map((r) => r.id), templateId)}>➕ Thêm {selOthers || ""} vào template</HButton>
          <HButton s={`${ghost} ${selInThis ? "border-color:#E4C7C5; color:#B3261E" : "opacity:.5; pointer-events:none"}`} onClick={() => assign(selectedRows.filter(inThis).map((r) => r.id), null)}>➖ Gỡ {selInThis || ""} khỏi template</HButton>
          <HButton s={ghost} onClick={() => setSelected(new Set())}>Bỏ chọn</HButton>
        </div>
      )}

      <div style={sx(`background:#fff; border:1px solid #D3DCE3; border-radius:10px; overflow:auto; max-height:calc(100vh - 300px); ${busy ? "opacity:.6; pointer-events:none" : ""}`)}>
        <table style={sx("width:100%; border-collapse:collapse; min-width:900px")}>
          <thead>
            <tr>
              <th style={sx(gth + "; width:38px; text-align:center")}><input type="checkbox" checked={allChecked} onChange={toggleAll} style={sx("cursor:pointer")} /></th>
              <th style={sx(gth + "; width:44px; text-align:center")}>No.</th>
              <th style={sx(gth)}>Tên khách</th>
              <th style={sx(gth)}>WhatsApp / SĐT</th>
              <th style={sx(gth)}>Quốc gia</th>
              <th style={sx(gth)}>Trạng thái</th>
              <th style={sx(gth + "; width:110px; text-align:center")}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:24px")}>Không có khách hàng khớp.</td></tr>}
            {items.map((c, i) => {
              const on = selected.has(c.id);
              const here = inThis(c);
              return (
                <tr key={c.id} style={sx(`background:${on ? "#EAF3EC" : i % 2 ? "#FBFDFB" : "#fff"}`)}>
                  <td style={sx(gtd + "; text-align:center")}><input type="checkbox" checked={on} onChange={() => toggleOne(c.id)} style={sx("cursor:pointer")} /></td>
                  <td style={sx(gtd + "; text-align:center; color:#8B9A90")}>{(page - 1) * LIMIT + i + 1}</td>
                  <td style={sx(gtd + "; font-weight:600; color:#14261A; min-width:150px")}>{c.name}</td>
                  <td style={sx(gtd)}>{c.whatsappPhone || c.phone || "—"}</td>
                  <td style={sx(gtd)}>{c.market || "—"}</td>
                  <td style={sx(gtd)}>
                    {here ? (
                      <span style={sx("font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:#E7F5EC; color:#1F7440")}>Trong template này</span>
                    ) : c.template ? (
                      <span style={sx("font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:#FBF3E3; color:#B7791F")} title={c.template.name}>Ở: {c.template.name}</span>
                    ) : (
                      <span style={sx("font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:#F1F4F1; color:#8B9A90")}>Trong kho</span>
                    )}
                  </td>
                  <td style={sx(gtd + "; text-align:center")}>
                    {here ? (
                      <HButton s="border:1px solid #E4C7C5; border-radius:6px; background:#fff; color:#B3261E; font-size:12px; font-weight:600; cursor:pointer; padding:0 12px; height:28px" onClick={() => assign([c.id], null)}>Gỡ</HButton>
                    ) : (
                      <HButton s="border:none; border-radius:6px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:12px; font-weight:600; cursor:pointer; padding:0 14px; height:28px" onClick={() => assign([c.id], templateId)}>Thêm</HButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={sx("display:flex; align-items:center; gap:8px; margin-top:10px")}>
        <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>Trang {Math.min(page, totalPages)}/{totalPages} · {total} khách</div>
        <HButton s={`${ghost} ${page <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Trước</HButton>
        <HButton s={`${ghost} ${page >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage((p) => p + 1)}>Sau ›</HButton>
      </div>

      {/* Modal tạo khách mới (gắn thẳng vào template này) */}
      {newC && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setNewC(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:440px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:16px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Thêm khách mới vào template</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setNewC(null)}>✕</HButton>
            </div>
            <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}><span style={sx(lbl)}>Tên khách *</span>
              <HInput s={inp} focus={focus} value={newC.name} onChange={(e) => setNewC({ ...newC, name: e.target.value })} placeholder="Fresh Orient Co." /></label>
            <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}><span style={sx(lbl)}>Số WhatsApp</span>
              <HInput s={inp} focus={focus} value={newC.whatsappPhone} onChange={(e) => setNewC({ ...newC, whatsappPhone: e.target.value })} placeholder="84901234001" /></label>
            <label style={sx("display:flex; flex-direction:column; margin-bottom:16px")}><span style={sx(lbl)}>Quốc gia</span>
              <HInput s={inp} focus={focus} value={newC.market} onChange={(e) => setNewC({ ...newC, market: e.target.value })} placeholder="INDIA" /></label>
            <div style={sx("display:flex; gap:10px")}>
              <HButton s={`${green} flex:1; height:44px`} onClick={createNew}>Tạo & thêm vào template</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setNewC(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
