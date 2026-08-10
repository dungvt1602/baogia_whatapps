"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON } from "@/components/common/api";

type Log = {
  id: string;
  userId: string | null;
  actorName: string | null;
  action: string;
  target: string | null;
  result: string | null;
  note: string | null;
  createdAt: string;
};
type SortKey = "createdAt" | "actorName" | "action" | "result";

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; user-select:none; text-align:left; position:sticky; top:0";
const gtd = "padding:6px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; white-space:nowrap; background:inherit";
const fmtDate = (s: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(s));

function ResultBadge({ r }: { r: string | null }) {
  const ok = (r || "").toUpperCase() === "SUCCESS";
  const bad = (r || "").toUpperCase() === "FAILED";
  const bg = ok ? "#E7F5EC" : bad ? "#FDECEC" : "#F1F4F1";
  const fg = ok ? "#1F7440" : bad ? "#B3261E" : "#8B9A90";
  return <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${bg}; color:${fg}`)}>{r || "—"}</span>;
}

export default function LogsScreen() {
  const [rows, setRows] = useState<Log[]>([]);
  const [detail, setDetail] = useState<Log | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });

  const load = useCallback(async () => {
    try { setRows(await getJSON<Log[]>("/api/activity")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  const view = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const arr = rows.filter((l) => !kw || [l.actorName, l.action, l.target, l.note, l.result].some((v) => (v || "").toLowerCase().includes(kw)));
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
  function onSort(key: SortKey) { setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })); }
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  function exportCsv() {
    const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ["THOI_GIAN", "NGUOI_THUC_HIEN", "HANH_DONG", "DOI_TUONG", "KET_QUA", "GHI_CHU"];
    const data = view.map((l) => [fmtDate(l.createdAt), l.actorName || "", l.action, l.target || "", l.result || "", l.note || ""]);
    const csv = [head, ...data].map((r) => r.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "nhat-ky.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "createdAt", label: "Thời gian" }, { key: "actorName", label: "Người thực hiện" }, { key: "action", label: "Hành động" }, { key: "result", label: "Kết quả" },
  ];

  return (
    <div>
      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap")}>
        <div style={sx("position:relative; width:280px")}>
          <span style={sx("position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0")}>🔍</span>
          <HInput s={`${inp} height:34px; padding-left:32px`} focus={focus} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm hành động, người, đối tượng..." />
        </div>
        <div style={sx("font-size:12.5px; color:#7B8A80")}>{view.length} bản ghi · 3 ngày gần nhất</div>
        <div style={sx("flex:1")} />
        <HButton s={ghost} onClick={load}>↻ Tải lại</HButton>
        <HButton s={ghost} onClick={exportCsv}>⭳ Excel</HButton>
      </div>

      <div style={sx("background:#fff; border:1px solid #D3DCE3; border-radius:10px; overflow:auto; max-height:calc(100vh - 200px)")}>
        <table style={sx("width:100%; border-collapse:collapse; min-width:900px")}>
          <thead>
            <tr>
              <th style={sx(gth + "; width:44px; text-align:center")}>No.</th>
              {cols.map((c) => (
                <th key={c.key} onClick={() => onSort(c.key)} style={sx(gth + "; cursor:pointer")} title="Bấm để sắp xếp">{c.label}<span style={sx("color:#1F7440")}>{arrow(c.key)}</span></th>
              ))}
              <th style={sx(gth)}>Đối tượng</th>
              <th style={sx(gth)}>Ghi chú</th>
              <th style={sx(gth + "; width:70px; text-align:center")}>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && <tr><td colSpan={8} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:24px")}>Chưa có nhật ký nào.</td></tr>}
            {paged.map((l, i) => (
              <tr key={l.id} style={sx(`background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                <td style={sx(gtd + "; text-align:center; color:#8B9A90")}>{(curPage - 1) * 15 + i + 1}</td>
                <td style={sx(gtd + "; color:#4A5A4E")}>{fmtDate(l.createdAt)}</td>
                <td style={sx(gtd)}>{l.actorName || "—"}</td>
                <td style={sx(gtd + "; font-weight:600")}>{l.action}</td>
                <td style={sx(gtd + "; text-align:left")}><ResultBadge r={l.result} /></td>
                <td style={sx(gtd + "; min-width:130px")} title={l.target || ""}>{l.target || "—"}</td>
                <td style={sx(gtd + "; min-width:150px; color:#7B8A80")} title={l.note || ""}>{l.note || "—"}</td>
                <td style={sx(gtd + "; text-align:center")}>
                  <HButton s="border:1px solid #DCE3DC; border-radius:6px; background:#fff; color:#33475B; font-size:12px; font-weight:600; cursor:pointer; padding:0 9px; height:28px" onClick={() => setDetail(l)}>Xem</HButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={sx("display:flex; align-items:center; gap:8px; margin-top:10px")}>
        <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>Trang {curPage}/{totalPages} · {view.length} bản ghi</div>
        <HButton s={`${ghost} ${curPage <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage - 1)}>‹ Trước</HButton>
        <HButton s={`${ghost} ${curPage >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage + 1)}>Sau ›</HButton>
      </div>
      <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Chỉ hiển thị <b>3 ngày gần nhất</b>. Mỗi ngày lúc ~2h sáng hệ thống tự dọn log <b>gửi thành công</b> quá 3 ngày (log lỗi được giữ lại). Bấm tiêu đề cột để sắp xếp.</div>

      {detail && (
        <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setDetail(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:460px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Chi tiết nhật ký</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setDetail(null)}>✕</HButton>
            </div>
            <div style={sx("border:1px solid #E9EEE9; border-radius:12px; overflow:hidden")}>
              {([["Thời gian", fmtDate(detail.createdAt)], ["Người thực hiện", detail.actorName || "—"], ["Hành động", detail.action], ["Đối tượng", detail.target || "—"], ["Kết quả", detail.result || "—"], ["Ghi chú", detail.note || "—"]] as [string, string][]).map(([k, v], idx) => (
                <div key={k} style={sx(`display:flex; font-size:13px; ${idx ? "border-top:1px solid #EFF3EF" : ""}`)}>
                  <div style={sx("width:130px; flex-shrink:0; padding:9px 12px; background:#F7FAF7; color:#6B7A70; font-weight:600")}>{k}</div>
                  <div style={sx("flex:1; padding:9px 12px; color:#14261A; white-space:pre-wrap")}>{v}</div>
                </div>
              ))}
            </div>
            <div style={sx("display:flex; justify-content:flex-end; margin-top:16px")}>
              <HButton s={`${ghost} height:42px`} onClick={() => setDetail(null)}>Đóng</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
