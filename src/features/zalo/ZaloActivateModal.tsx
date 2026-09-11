"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sx, HButton } from "@/components/common/ui";
import { getJSON, postJSON, sendJSON } from "@/components/common/api";
import { toast } from "sonner";

// Modal KÍCH HOẠT ZALO cho 1 tài khoản (giống nút "Kết nối" bên worker Go):
//   Bấm Kích hoạt -> app cấp mã 6 số -> người dùng nhắn mã vào OA -> webhook gắn Zalo -> modal tự thấy (poll 3s).
//   Sau đó mọi phản hồi khách (WhatsApp/Zalo) được báo về Zalo người này (qua kênh nhận ZALO tự tạo).

type Status = {
  linked: boolean;
  zaloUserId: string;
  zaloName: string;
  linkedAt: string | null;
  pending: { expiresAt: string } | null;
  oaId: string;
  oaName: string;
  oaConnected: boolean;
  tokenShared: boolean;
  webhookLastAt: string | null;
};
type Code = { code: string; expiresAt: string; oaId: string; oaName: string; oaConnected: boolean; userName: string };

const green = "border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:14px; font-weight:600; cursor:pointer; height:44px; padding:0 18px";
const ghost = "border:1px solid #DCE3DC; border-radius:11px; background:#fff; color:#4A5A4E; font-size:14px; font-weight:600; cursor:pointer; height:44px; padding:0 16px";
const danger = "border:1px solid #E4C7C5; border-radius:11px; background:#fff; color:#B3261E; font-size:14px; font-weight:600; cursor:pointer; height:44px; padding:0 16px";
const fmtDate = (s: string | null) => (s ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s)) : "—");

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function ZaloActivateModal({ userId, userName, onClose, onChanged }: { userId: string; userName: string; onClose: () => void; onChanged?: () => void }) {
  const [st, setSt] = useState<Status | null>(null);
  const [code, setCode] = useState<Code | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const prevLinked = useRef<boolean | null>(null); // phát hiện chuyển từ chưa -> đã kích hoạt (lúc poll)

  const load = useCallback(async () => {
    try {
      const s = await getJSON<Status>(`/api/users/${userId}/zalo`);
      if (prevLinked.current === false && s.linked) {
        toast.success(`Đã kích hoạt Zalo cho ${userName}${s.zaloName ? " (" + s.zaloName + ")" : ""}.`);
        setCode(null);
        onChanged?.();
      }
      prevLinked.current = s.linked;
      setSt(s);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [userId, userName, onChanged]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // Đang chờ mã -> poll trạng thái mỗi 3s + đồng hồ đếm ngược mỗi giây.
  const waiting = !!code && !st?.linked && new Date(code.expiresAt).getTime() > now;
  useEffect(() => {
    if (!waiting) return;
    const poll = setInterval(() => void load(), 3000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [waiting, load]);

  async function activate() {
    setBusy(true);
    try {
      const c = await postJSON<Code>(`/api/users/${userId}/zalo/link-code`);
      setCode(c);
      setNow(Date.now());
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 });
    } finally {
      setBusy(false);
    }
  }
  async function deactivate() {
    setBusy(true);
    try {
      await sendJSON("DELETE", `/api/users/${userId}/zalo`);
      toast.success("Đã huỷ kích hoạt Zalo.");
      setCode(null);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const oaLabel = st?.oaName ? `OA "${st.oaName}"` : st?.oaId ? `OA (id ${st.oaId})` : "Official Account của công ty";
  const expired = !!code && new Date(code.expiresAt).getTime() <= now;

  return (
    <div style={sx("position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:20px")}>
      <div onClick={onClose} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
      <div style={sx("position:relative; width:100%; max-width:460px; max-height:90vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
        <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:6px")}>
          <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Ⓩ Kích hoạt Zalo</div>
          <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={onClose}>✕</HButton>
        </div>
        <div style={sx("font-size:13px; color:#6B7A70; margin-bottom:16px")}>
          Tài khoản <b style={sx("color:#14261A")}>{userName}</b> — khi kích hoạt, mọi phản hồi của khách (WhatsApp/Zalo) sẽ được báo về Zalo cá nhân này.
        </div>

        {!st && <div style={sx("font-size:13px; color:#8B9A90")}>Đang tải…</div>}

        {st && !st.oaConnected && (
          <div style={sx("background:#FFF7E6; color:#8A5A00; border:1px solid #F3DFB0; border-radius:10px; padding:10px 14px; font-size:12.5px; margin-bottom:14px; line-height:1.5")}>
            Zalo OA chưa được kết nối (admin vào menu <b>Zalo OA</b> để kết nối). Vẫn kích hoạt được, nhưng tin báo chỉ gửi được sau khi OA đã kết nối.
          </div>
        )}
        {st && !st.linked && !st.webhookLastAt && (
          <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:12.5px; margin-bottom:14px; line-height:1.5")}>
            Web này <b>chưa từng nhận webhook Zalo</b> — mã nhắn vào OA sẽ <b>không tới đây</b>.
            {st.tokenShared
              ? <> Đang dùng chung với worker Go (webhook đang ở bên Go): admin vào <b>Zalo OA</b> → bảng <i>Người đã liên kết Zalo bên worker Go</i> → <b>+ Thêm làm kênh nhận</b> — không cần mã.</>
              : <> Cần trỏ Webhook URL trên developers.zalo.me về web này (xem màn <b>Zalo OA</b>).</>}
          </div>
        )}

        {st?.linked && (
          <div>
            <div style={sx("border:1px solid #CFE8D6; background:#F1FAF3; border-radius:12px; padding:14px; font-size:13.5px; color:#1F4A2C; line-height:1.6")}>
              <div style={sx("font-weight:700; font-size:15px; margin-bottom:4px")}>✅ Đã kích hoạt</div>
              <div>Zalo: <b>{st.zaloName || "(chưa đọc được tên)"}</b> <span style={sx("font-family:monospace; color:#6B7A70")}>#{st.zaloUserId}</span></div>
              <div>Lúc: {fmtDate(st.linkedAt)}</div>
            </div>
            <div style={sx("display:flex; gap:10px; margin-top:16px")}>
              <HButton s={`${ghost} flex:1`} onClick={onClose}>Đóng</HButton>
              <HButton s={`${danger} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={deactivate}>Huỷ kích hoạt</HButton>
            </div>
          </div>
        )}

        {st && !st.linked && !code && (
          <div>
            <ol style={sx("margin:0 0 16px; padding-left:22px; font-size:13.5px; color:#3C4A40; line-height:1.7; list-style:decimal")}>
              <li>Bấm <b>Lấy mã kích hoạt</b> — app cấp mã 6 số, hiệu lực 10 phút.</li>
              <li>Mở Zalo trên điện thoại, tìm {oaLabel}, <b>nhắn đúng mã đó</b> cho OA.</li>
              <li>Xong — OA trả lời xác nhận, màn này tự chuyển sang “Đã kích hoạt”.</li>
            </ol>
            <div style={sx("display:flex; gap:10px")}>
              <HButton s={`${green} flex:1 ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={activate}>{busy ? "Đang lấy mã…" : "Lấy mã kích hoạt"}</HButton>
              <HButton s={ghost} onClick={onClose}>Hủy</HButton>
            </div>
          </div>
        )}

        {st && !st.linked && code && (
          <div>
            <div style={sx("text-align:center; border:1.5px dashed #3EA85C; background:#F4FBF6; border-radius:14px; padding:18px 12px; margin-bottom:12px")}>
              <div style={sx("font-size:12px; color:#6B7A70; margin-bottom:6px")}>Nhắn mã này cho {oaLabel}</div>
              <div style={sx("font-size:38px; font-weight:800; letter-spacing:.35em; color:#1F7440; font-family:monospace")}>{code.code}</div>
              <div style={sx(`font-size:12.5px; margin-top:6px; color:${expired ? "#B3261E" : "#6B7A70"}`)}>
                {expired ? "Mã đã hết hạn — bấm Lấy mã mới." : `Hết hạn sau ${mmss(new Date(code.expiresAt).getTime() - now)} · đang chờ tin nhắn từ Zalo…`}
              </div>
            </div>
            <div style={sx("font-size:12.5px; color:#6B7A70; line-height:1.6; margin-bottom:14px")}>
              Mở Zalo → tìm {oaLabel} → gửi tin nhắn có nội dung <b>{code.code}</b>. Nếu OA chưa từng nhắn với bạn, bấm <b>Quan tâm</b> rồi nhắn mã.
            </div>
            <div style={sx("display:flex; gap:10px")}>
              <HButton s={`${ghost} flex:1 ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={activate}>{expired ? "Lấy mã mới" : "Lấy mã khác"}</HButton>
              <HButton s={ghost} onClick={onClose}>Đóng</HButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
