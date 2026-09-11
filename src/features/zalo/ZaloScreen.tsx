"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sx, HButton, HInput, SkeletonRows } from "@/components/common/ui";
import { getJSON, postJSON } from "@/components/common/api";
import { toast } from "sonner";

// Màn KẾT NỐI ZALO OA — thay cho 8 bước làm tay trong tài liệu (PKCE, curl đổi code, sửa .env...):
//   1) .env có ZALO_APP_ID + ZALO_SECRET_KEY (+ ZALO_WEBHOOK_SECRET cho webhook)
//   2) Trên developers.zalo.me khai Callback URL đúng như màn này hiển thị
//   3) Bấm "Kết nối Zalo OA" -> mở trang cấp quyền -> admin OA bấm Đồng ý -> Zalo tự quay về app
//   4) Server đổi code lấy token, ghi DB, từ đó TỰ làm mới mãi mãi — không đặt tay token nữa.

type Status = {
  config: { appId: string; hasSecretKey: boolean; hasWebhookSecret: boolean; hasLegacyStaticToken: boolean; hasBootstrapRefreshToken: boolean; hasSharedTokenSource: boolean; webhookForwardUrl: string };
  source: "shared" | "own" | "none"; // shared = đọc token từ DB worker Go; own = token riêng trong DB web
  webhookLastAt: string | null;
  sharedError: string;
  connected: boolean;
  oaId: string;
  oaName: string;
  expiresAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  tokenValid: boolean;
  minutesLeft: number | null;
  pendingAuthSince: string | null;
  callbackUrl: string;
  webhookUrl: string;
  autoRefresh: boolean;
};
type Started = { authUrl: string; callbackUrl: string; codeChallenge: string; state: string };
type SharedUser = { userId: string; zaloUserId: string; status: string; linkedAt: string | null; name: string; receiveChannel: { name: string; isActive: boolean } | null };
type Sender = {
  userId: string;
  name: string;
  lastText: string;
  lastType: string;
  lastAt: string;
  count: number;
  receiveChannel: { name: string; isActive: boolean } | null;
};

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:8px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 13px; height:34px;";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const danger = "border:1px solid #E4C7C5; border-radius:8px; background:#fff; color:#B3261E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px 20px; margin-bottom:14px";
const h2 = "font-size:15px; font-weight:700; color:#14261A; margin-bottom:10px; display:flex; align-items:center; gap:8px";
const kv = "display:flex; font-size:13px; border-top:1px solid #EFF3EF";
const kvK = "width:200px; flex-shrink:0; padding:8px 12px; background:#F7FAF7; color:#6B7A70; font-weight:600; font-size:12.5px";
const kvV = "flex:1; padding:8px 12px; color:#14261A; word-break:break-all";
const mono = "font-family:monospace; font-size:12.5px; background:#F4F6F3; border:1px solid #E4EAE4; border-radius:7px; padding:6px 9px; word-break:break-all; flex:1";
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; text-align:left";
const gtd = "padding:6px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; background:inherit";
const fmtDate = (s: string | null) => (s ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s)) : "—");

function Badge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${ok ? "#E7F5EC" : "#FDECEC"}; color:${ok ? "#1F7440" : "#B3261E"}; white-space:nowrap`)}>
      {ok ? yes : no}
    </span>
  );
}

function Copy({ value }: { value: string }) {
  return (
    <HButton
      s={`${ghost} height:30px; padding:0 10px; font-size:12px`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success("Đã sao chép");
        } catch {
          toast.error("Không sao chép được — hãy bôi đen rồi Ctrl+C");
        }
      }}
    >
      ⧉ Sao chép
    </HButton>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={sx(kv)}>
      <div style={sx(kvK)}>{k}</div>
      <div style={sx(kvV)}>{v}</div>
    </div>
  );
}

export default function ZaloScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const [st, setSt] = useState<Status | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(true);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [started, setStarted] = useState<Started | null>(null);
  const [busy, setBusy] = useState("");
  const [manual, setManual] = useState({ code: "", oaId: "" });
  const [test, setTest] = useState({ userId: "", text: "" });
  const [confirmDisc, setConfirmDisc] = useState(false);
  // Callback URL dùng khi cấp quyền — PHẢI trùng ô "Official Account Callback Url" trên Zalo.
  // Mặc định = URL app này; sửa được (vd https://localhost/zalo-callback đã đăng ký sẵn -> đổi code tay).
  const [cbUrl, setCbUrl] = useState("");

  const load = useCallback(async () => {
    try {
      const s = await getJSON<Status>("/api/zalo/status");
      setSt(s);
      setCbUrl((cur) => cur || s.callbackUrl);
      if (s.source === "shared") setSharedUsers(await getJSON<SharedUser[]>("/api/zalo/shared-users").catch(() => []));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  const loadSenders = useCallback(async () => {
    setLoadingSenders(true);
    try {
      setSenders(await getJSON<Sender[]>("/api/zalo/senders"));
    } catch {
      // bảng chưa có dữ liệu Zalo -> bỏ qua
    } finally {
      setLoadingSenders(false);
    }
  }, []);
  useEffect(() => {
    (async () => {
      await Promise.all([load(), loadSenders()]);
    })();
  }, [load, loadSenders]);

  // Zalo callback quay về kèm ?zalo=ok|err -> báo kết quả rồi xoá query khỏi URL.
  useEffect(() => {
    const r = sp.get("zalo");
    if (!r) return;
    if (r === "ok") toast.success(`Đã kết nối Zalo OA${sp.get("oa") ? " " + sp.get("oa") : ""} — token sẽ tự làm mới.`);
    else toast.error("Kết nối Zalo thất bại: " + (sp.get("msg") || "không rõ lý do"), { duration: 8000 });
    router.replace("/zalo-oa");
  }, [sp, router]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 });
    } finally {
      setBusy("");
    }
  }

  const start = () =>
    run("start", async () => {
      const r = await postJSON<Started>("/api/zalo/oauth/start", { callbackUrl: cbUrl.trim() || undefined });
      setStarted(r);
      await load();
    });
  const refresh = () =>
    run("refresh", async () => {
      const r = await postJSON<{ expiresAt: string }>("/api/zalo/refresh");
      toast.success("Đã làm mới token — hết hạn " + fmtDate(r.expiresAt));
      await load();
    });
  const exchange = () =>
    run("exchange", async () => {
      if (!manual.code.trim()) throw new Error("Dán code Zalo trả về trước.");
      await postJSON("/api/zalo/oauth/exchange", { code: manual.code.trim(), oaId: manual.oaId.trim() || undefined });
      toast.success("Đã đổi code lấy token — Zalo OA đã kết nối.");
      setManual({ code: "", oaId: "" });
      setStarted(null);
      await load();
    });
  const sendTest = () =>
    run("test", async () => {
      await postJSON("/api/zalo/test", { userId: test.userId.trim(), text: test.text.trim() || undefined });
      toast.success("Đã gửi tin thử — kiểm tra Zalo của người nhận.");
    });
  const disconnect = () =>
    run("disc", async () => {
      await postJSON("/api/zalo/disconnect");
      setConfirmDisc(false);
      setStarted(null);
      toast.success("Đã ngắt kết nối Zalo OA.");
      await load();
    });
  const addReceive = (s: Sender) =>
    run("recv-" + s.userId, async () => {
      await postJSON("/api/receive-channels", {
        name: s.name ? `Zalo — ${s.name}` : `Zalo ${s.userId}`,
        type: "ZALO",
        accountId: s.userId,
        apiKeyEnv: "ZALO_OA_TOKEN_MAIN", // chỉ là fallback; token thật lấy từ DB (đã kết nối OA)
        note: "Thêm từ màn Zalo OA",
        isActive: true,
      });
      toast.success(`Đã thêm ${s.name || s.userId} làm kênh nhận (đích báo sếp).`);
      await loadSenders();
    });

  const cfgOk = !!st?.config.appId && !!st?.config.hasSecretKey;
  const shared = st?.source === "shared";
  // Thêm 1 người (từ bảng Go hoặc bảng người đã nhắn) làm kênh nhận ZALO ở web này.
  const addReceiveUid = (uid: string, name: string) =>
    run("recv-" + uid, async () => {
      await postJSON("/api/receive-channels", {
        name: name ? `Zalo — ${name}` : `Zalo ${uid}`,
        type: "ZALO",
        accountId: uid,
        apiKeyEnv: "ZALO_OA_TOKEN_MAIN",
        note: "Thêm từ màn Zalo OA (liên kết bên worker Go)",
        isActive: true,
      });
      toast.success(`Đã thêm ${name || uid} làm kênh nhận (đích báo sếp).`);
      await Promise.all([load(), loadSenders()]);
    });

  return (
    <div style={sx("max-width:980px")}>
      {/* ---- Trạng thái ---- */}
      <div style={sx(card)}>
        <div style={sx(h2)}>
          Trạng thái kết nối
          {st && <Badge ok={st.connected && st.tokenValid} yes="Đã kết nối" no={st.connected ? "Token hết hạn" : "Chưa kết nối"} />}
          {shared && <span style={sx("font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:#EAF0F6; color:#33475B")}>Dùng chung token với worker Go</span>}
        </div>
        {shared && st?.sharedError && (
          <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:10px")}>{st.sharedError}</div>
        )}
        {!st ? (
          <div style={sx("font-size:13px; color:#8B9A90")}>Đang tải…</div>
        ) : (
          <div style={sx("border:1px solid #E9EEE9; border-radius:12px; overflow:hidden")}>
            <div style={sx(kv + "; border-top:none")}>
              <div style={sx(kvK)}>Official Account</div>
              <div style={sx(kvV)}>
                {st.oaName ? <b>{st.oaName}</b> : null}
                {st.oaName && st.oaId ? " · " : ""}
                {st.oaId ? <span style={sx("font-family:monospace")}>OA id {st.oaId}</span> : <span style={sx("color:#8B9A90")}>chưa rõ (sẽ tự bắt khi cấp quyền / webhook)</span>}
              </div>
            </div>
            <Row k="Access token hết hạn" v={st.expiresAt ? <>{fmtDate(st.expiresAt)} {st.minutesLeft != null && <span style={sx(`color:${st.minutesLeft > 10 ? "#1F7440" : "#B3261E"}`)}>({st.minutesLeft > 0 ? `còn ${st.minutesLeft} phút` : "đã hết hạn — sẽ tự làm mới khi dùng"})</span>}</> : "—"} />
            <Row k="Làm mới lần cuối" v={fmtDate(st.updatedAt)} />
            <Row k="Webhook nhận lần cuối" v={st.webhookLastAt ? fmtDate(st.webhookLastAt) : <span style={sx("color:#B3261E")}>chưa từng — webhook Zalo chưa trỏ về web này (mã kích hoạt 6 số sẽ không tới)</span>} />
            <Row k="Tự làm mới" v={shared ? "Worker Go làm mới; web này chỉ đọc token từ DB Go (cache 5 phút, đọc lại ngay nếu Zalo báo -216)" : st.autoRefresh ? "Bật — job nền mỗi 5 phút + làm mới ngay lúc gửi tin + /api/cron/zalo-token" : <span style={sx("color:#B3261E")}>SEND_WORKER_DISABLED=true — chỉ làm mới lúc gửi tin / cron</span>} />
          </div>
        )}
        {st && cfgOk && !shared && (
          <div style={sx("display:flex; gap:8px; align-items:center; margin-top:12px; flex-wrap:wrap")}>
            <span style={sx("font-size:12.5px; font-weight:600; color:#3C4A40; white-space:nowrap")}>Callback URL cấp quyền</span>
            <div style={sx("flex:1; min-width:260px")}><HInput s={`${inp} height:34px; font-family:monospace; font-size:12.5px`} focus={focus} value={cbUrl} onChange={(e) => setCbUrl(e.target.value)} placeholder={st.callbackUrl} /></div>
            <span style={sx("font-size:11.5px; color:#8B9A90")}>phải trùng ô Official Account Callback Url trên Zalo</span>
          </div>
        )}
        <div style={sx("display:flex; gap:8px; margin-top:12px; flex-wrap:wrap")}>
          {!shared && (
            <HButton s={`${green} ${!cfgOk || busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={start}>
              {busy === "start" ? "Đang tạo…" : st?.connected ? "🔗 Kết nối lại (cấp quyền lại)" : "🔗 Kết nối Zalo OA"}
            </HButton>
          )}
          {!shared && <HButton s={`${ghost} ${!st?.connected || busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={refresh}>{busy === "refresh" ? "Đang làm mới…" : "↻ Làm mới token ngay"}</HButton>}
          <HButton s={ghost} onClick={() => { void load(); void loadSenders(); }}>⟳ Tải lại</HButton>
          <div style={sx("flex:1")} />
          {!shared && st?.connected && <HButton s={`${danger} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={() => setConfirmDisc(true)}>Ngắt kết nối</HButton>}
        </div>
        {shared && (
          <div style={sx("font-size:12px; color:#8B9A90; margin-top:10px; line-height:1.6")}>
            Token do worker Go cấp quyền và làm mới (bảng <span style={sx("font-family:monospace")}>zalo_oa_tokens</span> bên đó); web này không cần cấp quyền. Muốn tách riêng: bỏ <span style={sx("font-family:monospace")}>ZALO_TOKEN_SOURCE_DB_URL</span> rồi bấm Kết nối.
          </div>
        )}
        {!cfgOk && st && !shared && (
          <div style={sx("background:#FFF7E6; color:#8A5A00; border:1px solid #F3DFB0; border-radius:10px; padding:10px 14px; font-size:13px; margin-top:12px")}>
            Chưa có <b>ZALO_APP_ID</b> / <b>ZALO_SECRET_KEY</b> trong .env (Render → Environment). Lấy ở developers.zalo.me → app → Cài đặt. Điền xong khởi động lại app rồi quay lại đây.
          </div>
        )}
      </div>

      {/* ---- Luồng cấp quyền (sau khi bấm Kết nối) ---- */}
      {started && (
        <div style={sx(card + "; border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.12)")}>
          <div style={sx(h2)}>Cấp quyền cho app — làm theo 2 bước</div>
          <ol style={sx("margin:0; padding-left:22px; font-size:13.5px; color:#3C4A40; line-height:1.7; list-style:decimal")}>
            <li>
              Trên <b>developers.zalo.me</b> → app → <b>Official Account</b> → <b>Đường dẫn yêu cầu cấp quyền</b>: ô <b>Official Account Callback Url</b> phải đúng bằng:
              <div style={sx("display:flex; gap:8px; align-items:center; margin:6px 0 4px")}>
                <div style={sx(mono)}>{started.callbackUrl}</div>
                <Copy value={started.callbackUrl} />
              </div>
              <div style={sx("font-size:12px; color:#8B9A90")}>Bấm <b>Cập nhật</b> ở ô đó (chỉ cần làm 1 lần). Ô Code Challenge / State trên trang Zalo không cần điền — link bên dưới đã kèm sẵn.</div>
            </li>
            <li style={sx("margin-top:8px")}>
              Mở link cấp quyền, đăng nhập bằng tài khoản <b>admin của OA</b>, bấm <b>Đồng ý</b>. Zalo sẽ tự chuyển về app này và token được lưu ngay.
              <div style={sx("margin-top:6px")}>
                <a href={started.authUrl} target="_blank" rel="noreferrer" style={sx(green + " display:inline-flex; align-items:center; text-decoration:none; height:36px")}>↗ Mở trang cấp quyền Zalo</a>
              </div>
            </li>
          </ol>
          <details style={sx("margin-top:12px; font-size:12.5px; color:#4A5A4E")}>
            <summary style={sx("cursor:pointer; font-weight:600")}>Zalo không quay về được app (chạy local / callback khác)? Đổi code bằng tay</summary>
            <div style={sx("margin-top:8px; line-height:1.6")}>
              Sau khi bấm Đồng ý, nhìn thanh địa chỉ trình duyệt: <span style={sx("font-family:monospace")}>…?oa_id=<b>…</b>&code=<b>…</b></span>. Dán vào đây trong vài phút (code dùng 1 lần):
            </div>
            <div style={sx("display:flex; gap:8px; margin-top:8px; flex-wrap:wrap")}>
              <div style={sx("flex:2; min-width:220px")}><HInput s={inp} focus={focus} value={manual.code} onChange={(e) => setManual({ ...manual, code: e.target.value })} placeholder="code=..." /></div>
              <div style={sx("flex:1; min-width:160px")}><HInput s={inp} focus={focus} value={manual.oaId} onChange={(e) => setManual({ ...manual, oaId: e.target.value })} placeholder="oa_id=... (tuỳ chọn)" /></div>
              <HButton s={`${green} height:40px ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={exchange}>{busy === "exchange" ? "Đang đổi…" : "Đổi code lấy token"}</HButton>
            </div>
            <div style={sx("margin-top:8px; display:flex; gap:8px; align-items:center")}>
              <span style={sx("white-space:nowrap")}>code_challenge (nếu Zalo bắt dán):</span>
              <div style={sx(mono)}>{started.codeChallenge}</div>
              <Copy value={started.codeChallenge} />
            </div>
          </details>
        </div>
      )}

      {/* ---- Cấu hình ---- */}
      {st && (
        <div style={sx(card)}>
          <div style={sx(h2)}>Cấu hình (.env / Render Environment)</div>
          <div style={sx("border:1px solid #E9EEE9; border-radius:12px; overflow:hidden")}>
            <div style={sx(kv + "; border-top:none")}>
              <div style={sx(kvK)}>ZALO_APP_ID</div>
              <div style={sx(kvV)}>{st.config.appId ? <span style={sx("font-family:monospace")}>{st.config.appId}</span> : <Badge ok={false} yes="" no="Thiếu" />}</div>
            </div>
            <Row k="ZALO_SECRET_KEY" v={<><Badge ok={st.config.hasSecretKey} yes="Đã có" no="Thiếu" /> <span style={sx("color:#8B9A90; font-size:12px")}>Secret Key của APP — dùng lấy/làm mới token</span></>} />
            <Row k="ZALO_WEBHOOK_SECRET" v={<><Badge ok={st.config.hasWebhookSecret} yes="Đã có" no="Chưa có — webhook không kiểm chữ ký" /> <span style={sx("color:#8B9A90; font-size:12px")}>ô &quot;Secret Key&quot; ở trang <b>Webhook</b> — KHÁC Secret Key app</span></>} />
            <Row k="Callback URL" v={<div style={sx("display:flex; gap:8px; align-items:center")}><div style={sx(mono)}>{st.callbackUrl}</div><Copy value={st.callbackUrl} /></div>} />
            <Row k="Webhook URL" v={<div style={sx("display:flex; gap:8px; align-items:center")}><div style={sx(mono)}>{st.webhookUrl}</div><Copy value={st.webhookUrl} /></div>} />
            <Row k="ZALO_TOKEN_SOURCE_DB_URL" v={<><Badge ok={st.config.hasSharedTokenSource} yes="Đã có — dùng chung token worker Go" no="Trống — web tự quản token" /> <span style={sx("color:#8B9A90; font-size:12px")}>connection string DB của worker Go (chỉ cần SELECT)</span></>} />
            <Row k="ZALO_WEBHOOK_FORWARD_URL" v={st.config.webhookForwardUrl ? <div style={sx("display:flex; gap:8px; align-items:center")}><div style={sx(mono)}>{st.config.webhookForwardUrl}</div></div> : <span style={sx("color:#8B9A90")}>Trống — không chuyển tiếp webhook. Dùng chung app với worker Go thì đặt = URL webhook của Go để bên đó vẫn nhận sự kiện.</span>} />
            {st.config.hasLegacyStaticToken && <Row k="ZALO_OA_TOKEN_MAIN" v={<span style={sx("color:#8B5A00")}>Có token tĩnh (cũ) — chỉ dùng khi chưa kết nối OA ở màn này. Kết nối xong có thể xoá.</span>} />}
            {st.config.hasBootstrapRefreshToken && <Row k="ZALO_OA_REFRESH_TOKEN" v={<span style={sx("color:#8B5A00")}>{st.connected ? "Đã bootstrap vào DB — nên xoá biến này khỏi .env (Zalo đã vô hiệu nó)." : "Sẽ tự bootstrap vào DB ở lần làm mới đầu tiên."}</span>} />}
          </div>
          <div style={sx("font-size:12px; color:#8B9A90; margin-top:8px; line-height:1.6")}>
            Webhook: developers.zalo.me → app → <b>Webhook</b> → dán Webhook URL → chọn sự kiện <i>user_send_text</i> (+ follow) → Lưu. Cần xác thực domain trước (tải file <span style={sx("font-family:monospace")}>zalo_verifier….html</span> Zalo cấp, bỏ vào thư mục <span style={sx("font-family:monospace")}>public/</span> của app rồi deploy).
          </div>
        </div>
      )}

      {/* ---- Gửi thử ---- */}
      <div style={sx(card)}>
        <div style={sx(h2)}>Gửi tin thử</div>
        <div style={sx("display:flex; gap:8px; flex-wrap:wrap")}>
          <div style={sx("flex:1; min-width:200px")}><HInput s={inp} focus={focus} value={test.userId} onChange={(e) => setTest({ ...test, userId: e.target.value })} placeholder="user_id hoặc SĐT Zalo người nhận (84…)" /></div>
          <div style={sx("flex:2; min-width:240px")}><HInput s={inp} focus={focus} value={test.text} onChange={(e) => setTest({ ...test, text: e.target.value })} placeholder="Nội dung (trống = tin mặc định)" /></div>
          <HButton s={`${green} height:40px ${!st?.connected && !st?.config.hasLegacyStaticToken || busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={sendTest}>{busy === "test" ? "Đang gửi…" : "📨 Gửi thử"}</HButton>
        </div>
        <div style={sx("font-size:12px; color:#8B9A90; margin-top:6px")}>Người nhận phải đã nhắn tin / quan tâm OA (Zalo chỉ cho OA nhắn người đã tương tác). Lỗi -216 = token hỏng; -213/-214 = chưa được duyệt quyền &quot;Gửi tin nhắn text&quot; hoặc người nhận chưa tương tác.</div>
      </div>

      {/* ---- Người đã liên kết Zalo bên worker Go (chế độ dùng chung) ---- */}
      {shared && (
        <div style={sx(card)}>
          <div style={sx(h2)}>Người đã liên kết Zalo bên worker Go <span style={sx("font-size:12px; font-weight:500; color:#8B9A90")}>— bảng zalo_user_bindings bên Go; bấm để nhận phản hồi khách ở web này</span></div>
          <div style={sx("border:1px solid #D3DCE3; border-radius:10px; overflow:auto")}>
            <table style={sx("width:100%; border-collapse:collapse; min-width:640px")}>
              <thead>
                <tr>
                  <th style={sx(gth)}>Tài khoản bên Go</th>
                  <th style={sx(gth)}>Zalo user_id</th>
                  <th style={sx(gth)}>Trạng thái</th>
                  <th style={sx(gth)}>Liên kết lúc</th>
                  <th style={sx(gth + "; text-align:center")}>Kênh nhận ở web này</th>
                </tr>
              </thead>
              <tbody>
                {sharedUsers.length === 0 && (
                  <tr><td colSpan={5} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:20px")}>{st?.sharedError || "Bên Go chưa có ai liên kết Zalo."}</td></tr>
                )}
                {sharedUsers.map((u, i) => {
                  const ch = u.receiveChannel;
                  return (
                    <tr key={u.zaloUserId} style={sx(`background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                      <td style={sx(gtd + "; font-weight:600")}>{u.name || <span style={sx("color:#8B9A90; font-weight:400")}>user #{u.userId}</span>}</td>
                      <td style={sx(gtd + "; font-family:monospace; cursor:pointer; color:#1F7440")} title="Bấm để điền vào ô Gửi thử" onClick={() => setTest((t) => ({ ...t, userId: u.zaloUserId }))}>{u.zaloUserId}</td>
                      <td style={sx(gtd)}><Badge ok={u.status === "ACTIVE"} yes="ACTIVE" no={u.status || "?"} /></td>
                      <td style={sx(gtd + "; white-space:nowrap; color:#7B8A80")}>{fmtDate(u.linkedAt)}</td>
                      <td style={sx(gtd + "; text-align:center; white-space:nowrap")}>
                        {ch ? (
                          <Badge ok={ch.isActive} yes={`✓ ${ch.name}`} no={`Tắt: ${ch.name}`} />
                        ) : (
                          <HButton s={`${ghost} height:28px; font-size:12px ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={() => addReceiveUid(u.zaloUserId, u.name)}>{busy === "recv-" + u.zaloUserId ? "Đang thêm…" : "+ Thêm làm kênh nhận"}</HButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Người đã nhắn OA ---- */}
      <div style={sx(card)}>
        <div style={sx(h2)}>Người đã nhắn / quan tâm OA <span style={sx("font-size:12px; font-weight:500; color:#8B9A90")}>— lấy user_id để thêm làm kênh nhận (đích báo sếp)</span></div>
        <div style={sx("border:1px solid #D3DCE3; border-radius:10px; overflow:auto")}>
          <table style={sx("width:100%; border-collapse:collapse; min-width:720px")}>
            <thead>
              <tr>
                <th style={sx(gth)}>Tên hiển thị</th>
                <th style={sx(gth)}>user_id</th>
                <th style={sx(gth)}>Tin gần nhất</th>
                <th style={sx(gth)}>Lúc</th>
                <th style={sx(gth + "; text-align:center")}>Kênh nhận</th>
              </tr>
            </thead>
            <tbody>
              {loadingSenders && <SkeletonRows cols={5} rows={3} cellStyle={gtd} />}
              {!loadingSenders && senders.length === 0 && (
                <tr><td colSpan={5} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:20px")}>Chưa có ai nhắn OA (hoặc webhook chưa nối). Nhờ sếp nhắn 1 tin bất kỳ cho OA rồi bấm Tải lại.</td></tr>
              )}
              {senders.map((s, i) => (
                <tr key={s.userId} style={sx(`background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                  <td style={sx(gtd + "; font-weight:600")}>{s.name || <span style={sx("color:#8B9A90; font-weight:400")}>(không đọc được tên)</span>}</td>
                  <td style={sx(gtd + "; font-family:monospace; cursor:pointer; color:#1F7440")} title="Bấm để điền vào ô Gửi thử" onClick={() => setTest((t) => ({ ...t, userId: s.userId }))}>{s.userId}</td>
                  <td style={sx(gtd + "; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap")} title={s.lastText}>{s.lastText || `[${s.lastType}]`}</td>
                  <td style={sx(gtd + "; white-space:nowrap; color:#7B8A80")}>{fmtDate(s.lastAt)}</td>
                  <td style={sx(gtd + "; text-align:center; white-space:nowrap")}>
                    {s.receiveChannel ? (
                      <Badge ok={s.receiveChannel.isActive} yes={`✓ ${s.receiveChannel.name}`} no={`Tắt: ${s.receiveChannel.name}`} />
                    ) : (
                      <HButton s={`${ghost} height:28px; font-size:12px ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={() => addReceive(s)}>{busy === "recv-" + s.userId ? "Đang thêm…" : "+ Thêm làm kênh nhận"}</HButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDisc && (
        <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setConfirmDisc(false)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:420px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("font-size:17px; font-weight:700; color:#14261A; margin-bottom:8px")}>Ngắt kết nối Zalo OA?</div>
            <div style={sx("font-size:13.5px; line-height:1.55; color:#4A5A4E; margin-bottom:18px")}>Token trong DB sẽ bị xoá — báo sếp qua Zalo ngừng hoạt động cho tới khi kết nối lại (phải cấp quyền lại từ đầu).</div>
            <div style={sx("display:flex; gap:10px")}>
              <HButton s="flex:1; height:44px; border:none; border-radius:11px; background:#B3261E; color:#fff; font-size:14px; font-weight:600; cursor:pointer" onClick={disconnect}>Ngắt kết nối</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setConfirmDisc(false)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
