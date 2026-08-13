"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON } from "@/components/common/api";
import { getSupabaseBrowser } from "@/components/common/supabase";

type Reply = {
  id: string;
  fromPhone: string;
  kind: string;
  type: string | null;
  text: string | null;
  receivedAt: string;
  customer: { name: string; company: string | null } | null;
  receiveChannel: { name: string; type: string } | null;
};

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; user-select:none; text-align:left; position:sticky; top:0";
const gtd = "padding:8px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; background:inherit; vertical-align:top";
const fmtDate = (s: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s));

const PER = 20;

export default function InboxScreen() {
  const [rows, setRows] = useState<Reply[]>([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [live, setLive] = useState(false); // đã kết nối realtime chưa
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try { setRows(await getJSON<Reply[]>("/api/inbound")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { (async () => { await load(); })(); }, [load]);

  // Realtime: nghe INSERT trên inbound_messages qua WebSocket của Supabase. Có tin mới -> tải lại
  // danh sách (để lấy kèm tên/công ty khách). Gộp nhiều insert sát nhau bằng debounce nhỏ.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return; // chưa cấu hình NEXT_PUBLIC_SUPABASE_* -> bỏ qua realtime, vẫn Tải lại thủ công
    const channel = supabase
      .channel("inbound_messages_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inbound_messages" },
        () => {
          if (reloadTimer.current) clearTimeout(reloadTimer.current);
          reloadTimer.current = setTimeout(() => { void load(); }, 400);
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[inbox] realtime chưa kết nối được:", status, "— kiểm tra env NEXT_PUBLIC_SUPABASE_* và đã bật Realtime cho bảng inbound_messages chưa.");
        }
      });
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const view = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((r) => [r.customer?.name, r.customer?.company, r.fromPhone, r.text, r.receiveChannel?.name].some((v) => (v || "").toLowerCase().includes(kw)));
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(view.length / PER));
  const curPage = Math.min(page, totalPages);
  const paged = view.slice((curPage - 1) * PER, curPage * PER);

  return (
    <div>
      {err && <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div>}

      <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap")}>
        <div style={sx("position:relative; width:280px")}>
          <span style={sx("position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0")}>🔍</span>
          <HInput s={`${inp} height:34px; padding-left:32px`} focus={focus} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm khách, công ty, SĐT, nội dung..." />
        </div>
        <div style={sx("font-size:12.5px; color:#7B8A80")}>{view.length} phản hồi</div>
        <div style={sx("flex:1")} />
        {live && (
          <span style={sx("display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#1F7440")}>
            <span style={sx("width:8px; height:8px; border-radius:50%; background:#3EA85C")} />
            Trực tiếp
          </span>
        )}
        <HButton s={ghost} onClick={load}>↻ Tải lại</HButton>
      </div>

      <div style={sx("background:#fff; border:1px solid #D3DCE3; border-radius:10px; overflow:auto; max-height:calc(100vh - 210px)")}>
        <table style={sx("width:100%; border-collapse:collapse; min-width:880px")}>
          <thead>
            <tr>
              <th style={sx(gth + "; width:44px; text-align:center")}>No.</th>
              <th style={sx(gth)}>Khách hàng</th>
              <th style={sx(gth)}>Công ty</th>
              <th style={sx(gth)}>SĐT</th>
              <th style={sx(gth)}>Kênh nhận</th>
              <th style={sx(gth)}>Nội dung trả lời</th>
              <th style={sx(gth + "; width:120px")}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && <tr><td colSpan={7} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:24px")}>Chưa có phản hồi nào. Khách trả lời qua WhatsApp sẽ hiện ở đây (cần bật webhook).</td></tr>}
            {paged.map((r, i) => (
              <tr key={r.id} style={sx(`background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                <td style={sx(gtd + "; text-align:center; color:#8B9A90")}>{(curPage - 1) * PER + i + 1}</td>
                <td style={sx(gtd + "; font-weight:600; white-space:nowrap")}>{r.customer?.name || <span style={sx("color:#8B9A90; font-weight:400")}>{r.fromPhone} (lạ)</span>}</td>
                <td style={sx(gtd + "; white-space:nowrap")}>{r.customer?.company || "—"}</td>
                <td style={sx(gtd + "; white-space:nowrap; color:#4A5A4E")}>{r.fromPhone}</td>
                <td style={sx(gtd + "; white-space:nowrap")}>{r.receiveChannel?.name || <span style={sx("color:#B9C5BC")}>—</span>}</td>
                <td style={sx(gtd + "; min-width:280px; white-space:pre-wrap; word-break:break-word")}>
                  {r.kind === "flow_response" && <span style={sx("font-size:10.5px; font-weight:700; color:#1F7440; background:#E7F5EC; border-radius:5px; padding:1px 6px; margin-right:6px")}>Flow</span>}
                  {r.text || "—"}
                </td>
                <td style={sx(gtd + "; white-space:nowrap; color:#7B8A80")}>{fmtDate(r.receivedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={sx("display:flex; align-items:center; gap:8px; margin-top:10px")}>
        <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>Trang {curPage}/{totalPages} · {view.length} phản hồi</div>
        <HButton s={`${ghost} ${curPage <= 1 ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage - 1)}>‹ Trước</HButton>
        <HButton s={`${ghost} ${curPage >= totalPages ? "opacity:.45; pointer-events:none" : ""}`} onClick={() => setPage(curPage + 1)}>Sau ›</HButton>
      </div>
      <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Tin khách trả lời qua WhatsApp (và bấm nút Flow) đổ về đây qua webhook, <b>tự cập nhật ngay</b> khi có phản hồi mới (realtime). Cần deploy public + khai webhook ở Meta App Dashboard. Hệ thống tự dọn phản hồi quá <b>3 ngày</b> lúc ~2h sáng (như log gửi).</div>
    </div>
  );
}
