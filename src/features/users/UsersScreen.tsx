"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON, sendJSON } from "@/components/common/api";

type Role = { role: { name: string; code: string } };
type User = {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  createdAt: string;
  userRoles: Role[];
};
type Form = { id?: string; username: string; email: string; fullName: string; password: string; isActive: boolean };
type SortKey = "username" | "fullName" | "email";

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:8px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 13px; height:34px;";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; user-select:none; text-align:left; position:sticky; top:0";
const gtd = "padding:6px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; white-space:nowrap; background:inherit";
const fmtDate = (s: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s));
const roleNames = (u: User) => u.userRoles.map((r) => r.role.name).join(", ") || "—";
const empty = (): Form => ({ username: "", email: "", fullName: "", password: "", isActive: true });

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
      <span style={sx(lbl)}>{label}</span>
      <HInput s={inp} focus={focus} value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function Badge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${ok ? "#E7F5EC" : "#FDECEC"}; color:${ok ? "#1F7440" : "#B3261E"}`)}>{ok ? yes : no}</span>;
}

export default function UsersScreen() {
  const [rows, setRows] = useState<User[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [detail, setDetail] = useState<User | null>(null);
  const [pending, setPending] = useState<{ text: string; run: () => Promise<void> } | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "username", dir: "asc" });

  const load = useCallback(async () => {
    try { setRows(await getJSON<User[]>("/api/users")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  const view = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const arr = rows.filter((u) => !kw || [u.username, u.email, u.fullName].some((v) => (v || "").toLowerCase().includes(kw)));
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
  const allChecked = paged.length > 0 && paged.every((u) => selected.has(u.id));
  function toggleAll() { const s = new Set(selected); if (allChecked) paged.forEach((u) => s.delete(u.id)); else paged.forEach((u) => s.add(u.id)); setSelected(s); }
  function toggleOne(id: string) { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); }
  function onSort(key: SortKey) { setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })); }
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  function openEdit(u: User) { setForm({ id: u.id, username: u.username, email: u.email, fullName: u.fullName || "", password: "", isActive: u.isActive }); }
  async function save() {
    if (!form?.username) return setErr("Nhập username");
    if (!form?.email) return setErr("Nhập email");
    setErr("");
    try {
      if (form.id) await patchJSON(`/api/users/${form.id}`, form);
      else await postJSON("/api/users", form);
      setForm(null); await load();
    } catch (e) { setErr((e as Error).message); }
  }
  function del(u: User) { setPending({ text: `Xóa người dùng "${u.username}"?`, run: async () => { await sendJSON("DELETE", `/api/users/${u.id}`); await load(); } }); }
  function delSelected() {
    if (selected.size === 0) return;
    const ids = [...selected];
    setPending({ text: `Xóa ${ids.length} người dùng đã chọn?`, run: async () => { await Promise.all(ids.map((id) => sendJSON("DELETE", `/api/users/${id}`))); setSelected(new Set()); await load(); } });
  }
  async function runPending() { if (!pending) return; setErr(""); try { await pending.run(); setPending(null); } catch (e) { setErr((e as Error).message); setPending(null); } }
  function exportCsv() {
    const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ["USERNAME", "HO_TEN", "EMAIL", "VAI_TRO", "TRANG_THAI"];
    const data = view.map((u) => [u.username, u.fullName || "", u.email, roleNames(u), u.isActive ? "Hoạt động" : "Khóa"]);
    const csv = [head, ...data].map((r) => r.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "nguoi-dung.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "username", label: "Username" }, { key: "fullName", label: "Họ tên" }, { key: "email", label: "Email" },
  ];

  return (
    <div>
      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap")}>
        <div style={sx("position:relative; width:260px")}>
          <span style={sx("position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0")}>🔍</span>
          <HInput s={`${inp} height:34px; padding-left:32px`} focus={focus} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm username, tên, email..." />
        </div>
        <div style={sx("font-size:12.5px; color:#7B8A80")}>{view.length} người dùng{selected.size ? ` · chọn ${selected.size}` : ""}</div>
        <div style={sx("flex:1")} />
        <HButton s={`${ghost} ${selected.size ? "" : "opacity:.5; pointer-events:none"}; border-color:#E4C7C5; color:#B3261E`} onClick={delSelected}>🗑 Xóa đã chọn</HButton>
        <HButton s={ghost} onClick={exportCsv}>⭳ Excel</HButton>
        <HButton s={green} onClick={() => setForm(empty())}>+ Thêm người dùng</HButton>
      </div>

      <div style={sx("background:#fff; border:1px solid #D3DCE3; border-radius:10px; overflow:auto; max-height:calc(100vh - 200px)")}>
        <table style={sx("width:100%; border-collapse:collapse; min-width:920px")}>
          <thead>
            <tr>
              <th style={sx(gth + "; width:38px; text-align:center")}><input type="checkbox" checked={allChecked} onChange={toggleAll} style={sx("cursor:pointer")} /></th>
              <th style={sx(gth + "; width:44px; text-align:center")}>No.</th>
              {cols.map((c) => (
                <th key={c.key} onClick={() => onSort(c.key)} style={sx(gth + "; cursor:pointer")} title="Bấm để sắp xếp">{c.label}<span style={sx("color:#1F7440")}>{arrow(c.key)}</span></th>
              ))}
              <th style={sx(gth)}>Vai trò</th>
              <th style={sx(gth + "; text-align:center")}>Trạng thái</th>
              <th style={sx(gth + "; width:110px; text-align:center")}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && <tr><td colSpan={8} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:24px")}>Không có người dùng nào.</td></tr>}
            {paged.map((u, i) => {
              const on = selected.has(u.id);
              return (
                <tr key={u.id} style={sx(`background:${on ? "#EAF3EC" : i % 2 ? "#FBFDFB" : "#fff"}`)}>
                  <td style={sx(gtd + "; text-align:center")}><input type="checkbox" checked={on} onChange={() => toggleOne(u.id)} style={sx("cursor:pointer")} /></td>
                  <td style={sx(gtd + "; text-align:center; color:#8B9A90")}>{(curPage - 1) * 15 + i + 1}</td>
                  <td style={sx(gtd + "; font-weight:600; color:#1F7440; cursor:pointer; text-decoration:underline")} onClick={() => setDetail(u)} title="Xem chi tiết">{u.username}</td>
                  <td style={sx(gtd + "; min-width:150px")}>{u.fullName || "—"}</td>
                  <td style={sx(gtd + "; min-width:170px")} title={u.email}>{u.email}</td>
                  <td style={sx(gtd)}>{roleNames(u)}</td>
                  <td style={sx(gtd + "; text-align:center")}><Badge ok={u.isActive} yes="Hoạt động" no="Khóa" /></td>
                  <td style={sx(gtd + "; text-align:center")}>
                    <div style={sx("display:flex; gap:6px; justify-content:center")}>
                      <HButton s="border:1px solid #DCE3DC; border-radius:6px; background:#fff; color:#33475B; font-size:12px; font-weight:600; cursor:pointer; padding:0 9px; height:28px" onClick={() => openEdit(u)}>Sửa</HButton>
                      <HButton s="width:28px; height:28px; border:1px solid #E4C7C5; border-radius:6px; background:#fff; color:#B3261E; cursor:pointer" title="Xóa" onClick={() => del(u)}>🗑</HButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={sx("display:flex; align-items:center; gap:8px; margin-top:10px")}>
        <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>Trang {curPage}/{totalPages} · {view.length} người dùng</div>
        <HButton s={`${ghost} ${curPage <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage - 1)}>‹ Trước</HButton>
        <HButton s={`${ghost} ${curPage >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage + 1)}>Sau ›</HButton>
      </div>

      {form && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setForm(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:460px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:16px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>{form.id ? "Sửa người dùng" : "Thêm người dùng"}</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setForm(null)}>✕</HButton>
            </div>
            <div style={sx("display:flex; gap:10px")}>
              <div style={sx("flex:1")}><Field label="Username *" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ngoc.anh" /></div>
              <div style={sx("flex:1")}><Field label="Họ tên" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Nguyễn Ngọc Anh" /></div>
            </div>
            <Field label="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ngoc.anh@agogroup.vn" />
            <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
              <span style={sx(lbl)}>{form.id ? "Đổi mật khẩu (để trống nếu giữ nguyên)" : "Mật khẩu đăng nhập"}</span>
              <HInput s={inp} focus={focus} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.id ? "••••••" : "Đặt mật khẩu cho user"} />
            </label>
            <label style={sx("display:flex; align-items:center; gap:8px; margin-bottom:14px; cursor:pointer; font-size:13.5px; color:#3C4A40")}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} style={sx("cursor:pointer; width:16px; height:16px")} />
              Đang hoạt động
            </label>
            <div style={sx("display:flex; gap:10px; margin-top:6px")}>
              <HButton s={`${green} flex:1; height:44px`} onClick={save}>{form.id ? "Lưu thay đổi" : "Thêm người dùng"}</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setForm(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}

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

      {detail && (
        <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setDetail(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:440px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Chi tiết người dùng</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setDetail(null)}>✕</HButton>
            </div>
            <div style={sx("border:1px solid #E9EEE9; border-radius:12px; overflow:hidden")}>
              {([["Username", detail.username], ["Họ tên", detail.fullName || "—"], ["Email", detail.email], ["Vai trò", roleNames(detail)], ["Trạng thái", detail.isActive ? "Hoạt động" : "Khóa"], ["Ngày tạo", fmtDate(detail.createdAt)]] as [string, string][]).map(([k, v], idx) => (
                <div key={k} style={sx(`display:flex; font-size:13px; ${idx ? "border-top:1px solid #EFF3EF" : ""}`)}>
                  <div style={sx("width:120px; flex-shrink:0; padding:9px 12px; background:#F7FAF7; color:#6B7A70; font-weight:600")}>{k}</div>
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
      )}
    </div>
  );
}
