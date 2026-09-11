"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sx, HButton, HInput, SkeletonRows } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON, sendJSON } from "@/components/common/api";
import { toast } from "sonner";

// Màn ZALO OA — viết cho ADMIN (không phải dev). Chỉ 3 câu hỏi:
//   1) Zalo đang hoạt động không?            -> khối Tình trạng (+ nút Kết nối / Kiểm tra)
//   2) Ai đang nhận tin báo qua Zalo?        -> khối Người nhận (thêm bằng SĐT, gửi thử, tắt/xoá)
//   3) Nhân viên tự kích hoạt được chưa?     -> khối Tự kích hoạt (mã 6 số; cần webhook)
// Mọi thứ kỹ thuật (env, URL, token, PKCE, dùng chung Go...) gom vào <details> "Dành cho kỹ thuật" ở cuối.

type Status = {
  config: { appId: string; hasSecretKey: boolean; hasWebhookSecret: boolean; hasLegacyStaticToken: boolean; hasBootstrapRefreshToken: boolean; hasSharedTokenSource: boolean; webhookForwardUrl: string };
  source: "shared" | "own" | "none";
  sharedError: string;
  webhookLastAt: string | null;
  connected: boolean;
  oaId: string;
  oaName: string;
  expiresAt: string | null;
  updatedAt: string | null;
  tokenValid: boolean;
  minutesLeft: number | null;
  callbackUrl: string;
  webhookUrl: string;
  autoRefresh: boolean;
};
type Started = { authUrl: string; callbackUrl: string; codeChallenge: string; state: string };
type Recipient = { id: string; name: string; type: string; accountId: string; isActive: boolean; note: string | null };
type Sender = { userId: string; name: string; lastText: string; lastType: string; lastAt: string; count: number; receiveChannel: { name: string; isActive: boolean } | null };
type SharedUser = { userId: string; zaloUserId: string; status: string; linkedAt: string | null; name: string; receiveChannel: { name: string; isActive: boolean } | null };

const inp = "height:40px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:8px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 13px; height:34px;";
const ghost = "border:1px solid #DCE3DC; border-radius:8px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const danger = "border:1px solid #E4C7C5; border-radius:8px; background:#fff; color:#B3261E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const small = "border:1px solid #DCE3DC; border-radius:6px; background:#fff; color:#33475B; font-size:12px; font-weight:600; cursor:pointer; padding:0 9px; height:28px";
const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px 20px; margin-bottom:14px";
const h2 = "font-size:15px; font-weight:700; color:#14261A; margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap";
const sub = "font-size:12.5px; color:#6B7A70; margin-bottom:12px; line-height:1.5";
const kv = "display:flex; font-size:13px; border-top:1px solid #EFF3EF";
const kvK = "width:200px; flex-shrink:0; padding:8px 12px; background:#F7FAF7; color:#6B7A70; font-weight:600; font-size:12.5px";
const kvV = "flex:1; padding:8px 12px; color:#14261A; word-break:break-all";
const mono = "font-family:monospace; font-size:12.5px; background:#F4F6F3; border:1px solid #E4EAE4; border-radius:7px; padding:6px 9px; word-break:break-all; flex:1";
const gth = "padding:7px 10px; font-size:11.5px; font-weight:700; color:#33475B; background:#EEF2F5; border:1px solid #D3DCE3; white-space:nowrap; text-align:left";
const gtd = "padding:6px 10px; font-size:12.5px; color:#1B2A20; border:1px solid #E4EAEF; background:inherit";
const okBox = "border:1px solid #CFE8D6; background:#F1FAF3; border-radius:12px; padding:14px 16px; color:#1F4A2C";
const warnBox = "border:1px solid #F3DFB0; background:#FFF7E6; border-radius:12px; padding:14px 16px; color:#8A5A00";
const errBox = "border:1px solid #F3C9C6; background:#FDECEC; border-radius:12px; padding:14px 16px; color:#B3261E";
const fmtDate = (s: string | null) => (s ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s)) : "—");

function Badge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return <span style={sx(`font-size:11px; font-weight:700; padding:2px 8px; border-radius:5px; background:${ok ? "#E7F5EC" : "#FDECEC"}; color:${ok ? "#1F7440" : "#B3261E"}; white-space:nowrap`)}>{ok ? yes : no}</span>;
}
function Copy({ value }: { value: string }) {
  return (
    <HButton s={`${ghost} height:30px; padding:0 10px; font-size:12px`} onClick={async () => { try { await navigator.clipboard.writeText(value); toast.success("Đã sao chép"); } catch { toast.error("Không sao chép được — hãy bôi đen rồi Ctrl+C"); } }}>
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
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRec, setLoadingRec] = useState(true);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [started, setStarted] = useState<Started | null>(null);
  const [busy, setBusy] = useState("");
  const [pasted, setPasted] = useState(""); // link/code Zalo trả về (đổi tay)
  const [newRec, setNewRec] = useState({ name: "", phone: "" });
  const [devTest, setDevTest] = useState({ userId: "", text: "" });
  const [confirm, setConfirm] = useState<{ text: string; run: () => Promise<void> } | null>(null);
  const [cbUrl, setCbUrl] = useState(""); // chỉ trong mục kỹ thuật

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
  const loadRecipients = useCallback(async () => {
    setLoadingRec(true);
    try {
      const all = await getJSON<Recipient[]>("/api/receive-channels");
      setRecipients(all.filter((c) => (c.type || "").toUpperCase() === "ZALO"));
    } catch {
      // bỏ qua
    } finally {
      setLoadingRec(false);
    }
  }, []);
  const loadSenders = useCallback(async () => {
    try {
      setSenders(await getJSON<Sender[]>("/api/zalo/senders"));
    } catch {
      // bỏ qua
    }
  }, []);
  useEffect(() => {
    (async () => {
      await Promise.all([load(), loadRecipients(), loadSenders()]);
    })();
  }, [load, loadRecipients, loadSenders]);

  // Zalo callback tự quay về kèm ?zalo=ok|err -> báo kết quả rồi xoá query khỏi URL.
  useEffect(() => {
    const r = sp.get("zalo");
    if (!r) return;
    if (r === "ok") toast.success("Đã kết nối Zalo OA — từ giờ tự gia hạn, không cần làm gì thêm.");
    else toast.error("Kết nối Zalo thất bại: " + (sp.get("msg") || "không rõ lý do"), { duration: 8000 });
    router.replace("/zalo-oa");
  }, [sp, router]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message, { duration: 9000 });
    } finally {
      setBusy("");
    }
  }
  const reloadAll = () => Promise.all([load(), loadRecipients(), loadSenders()]).then(() => undefined);

  // ---- hành động ----
  const start = () =>
    run("start", async () => {
      const r = await postJSON<Started>("/api/zalo/oauth/start", { callbackUrl: cbUrl.trim() || undefined });
      setStarted(r);
    });
  const exchange = () =>
    run("exchange", async () => {
      if (!pasted.trim()) throw new Error("Dán link (hoặc mã) Zalo chuyển tới vào ô trước.");
      await postJSON("/api/zalo/oauth/exchange", { url: pasted.trim() });
      toast.success("Đã kết nối Zalo OA — từ giờ tự gia hạn.");
      setPasted("");
      setStarted(null);
      await load();
    });
  const check = () =>
    run("check", async () => {
      const r = await postJSON<{ ok: boolean; oaName?: string }>("/api/zalo/check");
      toast.success(`Kết nối tốt — OA "${r.oaName || st?.oaName || "AGO Fruit"}" phản hồi bình thường.`);
      await load();
    });
  const refresh = () =>
    run("refresh", async () => {
      const r = await postJSON<{ expiresAt: string }>("/api/zalo/refresh");
      toast.success("Đã gia hạn token — hết hạn " + fmtDate(r.expiresAt));
      await load();
    });
  const disconnect = () =>
    setConfirm({
      text: "Ngắt kết nối Zalo OA? Tin báo qua Zalo sẽ ngừng cho tới khi kết nối lại (phải cấp quyền lại từ đầu).",
      run: async () => {
        await postJSON("/api/zalo/disconnect");
        setStarted(null);
        toast.success("Đã ngắt kết nối Zalo OA.");
        await load();
      },
    });
  const addRecipient = () =>
    run("add", async () => {
      const phone = newRec.phone.trim();
      if (!phone) throw new Error("Nhập SĐT Zalo (hoặc user_id) người nhận.");
      await postJSON("/api/receive-channels", {
        name: newRec.name.trim() || `Zalo ${phone}`,
        type: "ZALO",
        accountId: phone,
        apiKeyEnv: "ZALO_OA_TOKEN_MAIN",
        note: "Thêm từ màn Zalo OA",
        isActive: true,
      });
      // Gửi thử ngay để biết người này đã Quan tâm OA chưa — lỗi thì báo, vẫn giữ dòng vừa thêm.
      try {
        await postJSON("/api/zalo/test", { userId: phone, text: "✅ AGO báo giá: bạn đã được thêm vào danh sách nhận phản hồi khách hàng qua Zalo." });
        toast.success(`Đã thêm ${newRec.name.trim() || phone} và gửi tin thử thành công.`);
      } catch (e) {
        toast.warning(`Đã thêm nhưng chưa gửi được: ${(e as Error).message}`, { duration: 10000 });
      }
      setNewRec({ name: "", phone: "" });
      await loadRecipients();
    });
  const addFromSender = (uid: string, name: string) =>
    run("recv-" + uid, async () => {
      await postJSON("/api/receive-channels", { name: name ? `Zalo — ${name}` : `Zalo ${uid}`, type: "ZALO", accountId: uid, apiKeyEnv: "ZALO_OA_TOKEN_MAIN", note: "Thêm từ màn Zalo OA", isActive: true });
      toast.success(`Đã thêm ${name || uid} vào danh sách nhận tin.`);
      await reloadAll();
    });
  const testRecipient = (r: Recipient) =>
    run("test-" + r.id, async () => {
      await postJSON("/api/zalo/test", { userId: r.accountId, text: `✅ AGO báo giá: tin thử tới ${r.name}. Nếu nhận được nghĩa là Zalo đã hoạt động.` });
      toast.success(`Đã gửi tin thử tới ${r.name}.`);
    });
  const toggleRecipient = (r: Recipient) =>
    run("toggle-" + r.id, async () => {
      await patchJSON(`/api/receive-channels/${r.id}`, { isActive: !r.isActive });
      await loadRecipients();
    });
  const removeRecipient = (r: Recipient) =>
    setConfirm({
      text: `Bỏ ${r.name} khỏi danh sách nhận tin báo qua Zalo?`,
      run: async () => {
        await sendJSON("DELETE", `/api/receive-channels/${r.id}`);
        toast.success(`Đã bỏ ${r.name}.`);
        await reloadAll();
      },
    });
  const devSend = () =>
    run("devtest", async () => {
      await postJSON("/api/zalo/test", { userId: devTest.userId.trim(), text: devTest.text.trim() || undefined });
      toast.success("Đã gửi.");
    });
  async function runConfirm() {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    await run("confirm", c.run);
  }

  // ---- suy trạng thái bằng tiếng người ----
  const cfgOk = !!st?.config.appId && !!st?.config.hasSecretKey;
  const shared = st?.source === "shared";
  const healthy = !!st?.connected && !!st?.tokenValid;
  const oaLabel = st?.oaName ? `OA "${st.oaName}"` : "Official Account";
  const webhookReady = !!st?.webhookLastAt;
  const activeCount = recipients.filter((r) => r.isActive).length;

  return (
    <div style={sx("max-width:980px")}>
      {/* ================= 1. TÌNH TRẠNG ================= */}
      <div style={sx(card)}>
        <div style={sx(h2)}>Zalo đang hoạt động không?</div>
        <div style={sx(sub)}>Web dùng {oaLabel} để nhắn cho nhân viên mỗi khi khách hàng trả lời báo giá (WhatsApp/Zalo).</div>

        {!st && <div style={sx("font-size:13px; color:#8B9A90")}>Đang kiểm tra…</div>}

        {st && healthy && (
          <div style={sx(okBox)}>
            <div style={sx("font-size:15px; font-weight:700; margin-bottom:4px")}>✅ Đang hoạt động — {oaLabel}</div>
            <div style={sx("font-size:13px; line-height:1.6")}>
              {shared ? "Token dùng chung với hệ thống đơn hàng (worker Go) — bên đó gia hạn, web này chỉ đọc." : "Kết nối tự gia hạn, không cần làm gì thêm."}
              {" "}Tin báo đang gửi tới <b>{activeCount}</b> người (danh sách bên dưới).
            </div>
          </div>
        )}
        {st && !healthy && st.connected && (
          <div style={sx(errBox)}>
            <div style={sx("font-size:15px; font-weight:700; margin-bottom:4px")}>⛔ Kết nối gặp lỗi</div>
            <div style={sx("font-size:13px; line-height:1.6")}>Token đã hết hạn và chưa gia hạn được. Bấm <b>Kiểm tra kết nối</b> để thử gia hạn; vẫn lỗi thì bấm <b>Kết nối lại</b> (cấp quyền lại, ~2 phút).</div>
          </div>
        )}
        {st && !st.connected && (
          <div style={sx(warnBox)}>
            <div style={sx("font-size:15px; font-weight:700; margin-bottom:4px")}>⚠️ Chưa kết nối Zalo OA</div>
            <div style={sx("font-size:13px; line-height:1.6")}>
              {cfgOk
                ? <>Bấm <b>Kết nối Zalo OA</b>, đăng nhập bằng tài khoản <b>quản trị OA</b> và bấm Đồng ý — chỉ làm một lần.</>
                : <>Kỹ thuật chưa điền thông tin ứng dụng Zalo trên máy chủ (xem mục <i>Dành cho kỹ thuật</i> bên dưới).{shared && st.sharedError ? " " + st.sharedError : ""}</>}
            </div>
          </div>
        )}

        <div style={sx("display:flex; gap:8px; margin-top:12px; flex-wrap:wrap")}>
          {st && !shared && (
            <HButton s={`${green} ${!cfgOk || busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={start}>
              {busy === "start" ? "Đang chuẩn bị…" : st.connected ? "🔗 Kết nối lại" : "🔗 Kết nối Zalo OA"}
            </HButton>
          )}
          {st?.connected && <HButton s={`${ghost} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={check}>{busy === "check" ? "Đang kiểm tra…" : "🩺 Kiểm tra kết nối"}</HButton>}
          <HButton s={ghost} onClick={() => void reloadAll()}>⟳ Tải lại</HButton>
        </div>

        {/* Khung cấp quyền — 2 bước, không thuật ngữ */}
        {started && (
          <div style={sx("margin-top:14px; border:1.5px solid #3EA85C; border-radius:14px; padding:16px; background:#F8FCF9")}>
            <div style={sx("font-size:14px; font-weight:700; color:#14261A; margin-bottom:8px")}>Kết nối Zalo OA — 2 bước</div>
            <ol style={sx("margin:0; padding-left:22px; font-size:13.5px; color:#3C4A40; line-height:1.8; list-style:decimal")}>
              <li>
                Bấm <a href={started.authUrl} target="_blank" rel="noreferrer" style={sx(green + " display:inline-flex; align-items:center; text-decoration:none; height:32px; font-size:12.5px; margin:0 4px")}>↗ Mở trang Zalo</a>
                → đăng nhập bằng tài khoản <b>quản trị OA</b> → bấm <b>Đồng ý</b>.
              </li>
              <li>
                Zalo sẽ chuyển sang một trang (có thể báo &quot;không kết nối được&quot; — bình thường). <b>Sao chép nguyên đường link</b> trên thanh địa chỉ, dán vào ô này rồi bấm Hoàn tất:
                <div style={sx("display:flex; gap:8px; margin-top:8px; flex-wrap:wrap")}>
                  <div style={sx("flex:1; min-width:260px")}><HInput s={inp} focus={focus} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Dán link Zalo chuyển tới (https://…?oa_id=…&code=…)" /></div>
                  <HButton s={`${green} height:40px ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={exchange}>{busy === "exchange" ? "Đang kết nối…" : "✔ Hoàn tất"}</HButton>
                  <HButton s={`${ghost} height:40px`} onClick={() => setStarted(null)}>Hủy</HButton>
                </div>
                <div style={sx("font-size:12px; color:#8B9A90; margin-top:6px")}>Nếu Zalo tự quay về web này và báo &quot;Đã kết nối&quot; thì không cần dán gì cả.</div>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* ================= 2. NGƯỜI NHẬN ================= */}
      <div style={sx(card)}>
        <div style={sx(h2)}>Ai nhận tin báo qua Zalo?</div>
        <div style={sx(sub)}>Khi khách trả lời báo giá, những người dưới đây nhận tin trên Zalo. Người nhận phải <b>đã Quan tâm {oaLabel}</b> (mở Zalo → tìm OA → bấm Quan tâm) thì Zalo mới cho nhắn.</div>

        <div style={sx("display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center")}>
          <div style={sx("flex:1; min-width:160px")}><HInput s={inp} focus={focus} value={newRec.name} onChange={(e) => setNewRec({ ...newRec, name: e.target.value })} placeholder="Tên (vd Sếp Chí Anh)" /></div>
          <div style={sx("flex:1; min-width:180px")}><HInput s={inp} focus={focus} value={newRec.phone} onChange={(e) => setNewRec({ ...newRec, phone: e.target.value })} placeholder="SĐT Zalo (0905… / 84905…)" /></div>
          <HButton s={`${green} height:40px ${!st?.connected || busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={addRecipient}>{busy === "add" ? "Đang thêm…" : "+ Thêm & gửi thử"}</HButton>
        </div>

        <div style={sx("border:1px solid #D3DCE3; border-radius:10px; overflow:auto")}>
          <table style={sx("width:100%; border-collapse:collapse; min-width:640px")}>
            <thead>
              <tr>
                <th style={sx(gth)}>Tên</th>
                <th style={sx(gth)}>SĐT / Zalo</th>
                <th style={sx(gth + "; text-align:center")}>Nhận tin</th>
                <th style={sx(gth + "; text-align:center; width:230px")}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingRec && <SkeletonRows cols={4} rows={2} cellStyle={gtd} />}
              {!loadingRec && recipients.length === 0 && (
                <tr><td colSpan={4} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:20px")}>Chưa có ai. Nhập tên + SĐT Zalo ở trên rồi bấm Thêm.</td></tr>
              )}
              {recipients.map((r, i) => (
                <tr key={r.id} style={sx(`background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                  <td style={sx(gtd + "; font-weight:600")}>{r.name}</td>
                  <td style={sx(gtd + "; font-family:monospace")}>{r.accountId}</td>
                  <td style={sx(gtd + "; text-align:center")}><Badge ok={r.isActive} yes="Đang bật" no="Đã tắt" /></td>
                  <td style={sx(gtd + "; text-align:center; white-space:nowrap")}>
                    <div style={sx("display:flex; gap:6px; justify-content:center")}>
                      <HButton s={`${small} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={() => testRecipient(r)}>{busy === "test-" + r.id ? "…" : "📨 Gửi thử"}</HButton>
                      <HButton s={`${small} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={() => toggleRecipient(r)}>{r.isActive ? "Tắt" : "Bật"}</HButton>
                      <HButton s={`${small} border-color:#E4C7C5; color:#B3261E`} onClick={() => removeRecipient(r)}>Bỏ</HButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={sx("font-size:12px; color:#8B9A90; margin-top:8px")}>Nhận tin qua Telegram thì vào màn <b>Kênh nhận</b>.</div>
      </div>

      {/* ================= 3. TỰ KÍCH HOẠT ================= */}
      <div style={sx(card)}>
        <div style={sx(h2)}>Nhân viên tự kích hoạt bằng mã 6 số {st && <Badge ok={webhookReady} yes="Sẵn sàng" no="Chưa sẵn sàng" />}</div>
        <div style={sx(sub)}>Mỗi nhân viên bấm <b>Ⓩ Kích hoạt Zalo</b> dưới tên mình (góc trái) → nhận mã 6 số → nhắn mã vào {oaLabel} → tự được thêm vào danh sách nhận tin, không cần admin.</div>
        {st && !webhookReady && (
          <div style={sx(warnBox + "; font-size:13px; line-height:1.6")}>
            Chưa dùng được: Zalo chưa gửi tin nhắn OA về web này (phần <i>Webhook</i> — việc của kỹ thuật, xem mục cuối trang). Trong lúc chờ, admin thêm người nhận bằng SĐT ở khối trên là đủ.
          </div>
        )}
        {st && webhookReady && (
          <div style={sx("font-size:13px; color:#1F4A2C")}>Đã sẵn sàng — web nhận tin OA lần cuối lúc {fmtDate(st.webhookLastAt)}.</div>
        )}

        {senders.length > 0 && (
          <div style={sx("margin-top:12px")}>
            <div style={sx("font-size:12.5px; font-weight:600; color:#3C4A40; margin-bottom:6px")}>Người vừa nhắn / quan tâm OA — bấm để thêm vào danh sách nhận tin:</div>
            <div style={sx("border:1px solid #D3DCE3; border-radius:10px; overflow:auto")}>
              <table style={sx("width:100%; border-collapse:collapse; min-width:600px")}>
                <thead><tr><th style={sx(gth)}>Tên Zalo</th><th style={sx(gth)}>Tin gần nhất</th><th style={sx(gth)}>Lúc</th><th style={sx(gth + "; text-align:center")}></th></tr></thead>
                <tbody>
                  {senders.map((s, i) => (
                    <tr key={s.userId} style={sx(`background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                      <td style={sx(gtd + "; font-weight:600")}>{s.name || <span style={sx("color:#8B9A90; font-weight:400; font-family:monospace")}>{s.userId}</span>}</td>
                      <td style={sx(gtd + "; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap")} title={s.lastText}>{s.lastText || `[${s.lastType}]`}</td>
                      <td style={sx(gtd + "; white-space:nowrap; color:#7B8A80")}>{fmtDate(s.lastAt)}</td>
                      <td style={sx(gtd + "; text-align:center; white-space:nowrap")}>
                        {s.receiveChannel ? <Badge ok={s.receiveChannel.isActive} yes="✓ Đang nhận tin" no="Đã tắt" /> : <HButton s={`${small} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={() => addFromSender(s.userId, s.name)}>+ Thêm vào danh sách</HButton>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= 4. DÀNH CHO KỸ THUẬT ================= */}
      {st && (
        <details style={sx(card + "; padding:14px 20px")}>
          <summary style={sx("cursor:pointer; font-size:13.5px; font-weight:700; color:#4A5A4E")}>🛠 Dành cho kỹ thuật (cấu hình máy chủ, webhook, token)</summary>
          <div style={sx("margin-top:12px")}>
            <div style={sx("border:1px solid #E9EEE9; border-radius:12px; overflow:hidden; margin-bottom:12px")}>
              <div style={sx(kv + "; border-top:none")}><div style={sx(kvK)}>Nguồn token</div><div style={sx(kvV)}>{st.source === "shared" ? "Dùng chung DB worker Go (ZALO_TOKEN_SOURCE_DB_URL)" : st.source === "own" ? "Bảng zalo_oa_tokens của web (tự làm mới)" : "Chưa có"}{shared && st.sharedError ? <span style={sx("color:#B3261E")}> — {st.sharedError}</span> : null}</div></div>
              <Row k="OA id" v={<span style={sx("font-family:monospace")}>{st.oaId || "—"}</span>} />
              <Row k="Access token hết hạn" v={st.expiresAt ? <>{fmtDate(st.expiresAt)} {st.minutesLeft != null && <span style={sx(`color:${st.minutesLeft > 10 ? "#1F7440" : "#B3261E"}`)}>({st.minutesLeft > 0 ? `còn ${st.minutesLeft} phút` : "đã hết hạn"})</span>}</> : "—"} />
              <Row k="Làm mới lần cuối" v={fmtDate(st.updatedAt)} />
              <Row k="Tự làm mới" v={shared ? "Worker Go làm mới; web chỉ đọc (cache 5 phút, đọc lại khi -216)" : st.autoRefresh ? "Job nền 5 phút + lúc gửi tin + GET /api/cron/zalo-token" : <span style={sx("color:#B3261E")}>SEND_WORKER_DISABLED=true — chỉ lúc gửi tin / cron</span>} />
              <Row k="Webhook nhận lần cuối" v={st.webhookLastAt ? fmtDate(st.webhookLastAt) : <span style={sx("color:#B3261E")}>chưa từng — Webhook URL trên developers.zalo.me chưa trỏ về web này</span>} />
              <Row k="ZALO_APP_ID" v={st.config.appId ? <span style={sx("font-family:monospace")}>{st.config.appId}</span> : <Badge ok={false} yes="" no="Thiếu" />} />
              <Row k="ZALO_SECRET_KEY" v={<><Badge ok={st.config.hasSecretKey} yes="Đã có" no="Thiếu" /> <span style={sx("color:#8B9A90; font-size:12px")}>Secret Key của APP (lấy/làm mới token)</span></>} />
              <Row k="ZALO_WEBHOOK_SECRET" v={<><Badge ok={st.config.hasWebhookSecret} yes="Đã có" no="Chưa có — không kiểm chữ ký" /> <span style={sx("color:#8B9A90; font-size:12px")}>ô Secret Key ở trang Webhook — KHÁC Secret Key app</span></>} />
              <Row k="Callback URL (cấp quyền)" v={<div style={sx("display:flex; gap:8px; align-items:center; flex-wrap:wrap")}><div style={sx("flex:1; min-width:240px")}><HInput s={`${inp} height:32px; font-family:monospace; font-size:12px`} focus={focus} value={cbUrl} onChange={(e) => setCbUrl(e.target.value)} placeholder={st.callbackUrl} /></div><Copy value={cbUrl || st.callbackUrl} /><span style={sx("font-size:11.5px; color:#8B9A90")}>phải trùng ô Official Account Callback Url trên Zalo</span></div>} />
              <Row k="Webhook URL" v={<div style={sx("display:flex; gap:8px; align-items:center")}><div style={sx(mono)}>{st.webhookUrl}</div><Copy value={st.webhookUrl} /></div>} />
              <Row k="ZALO_WEBHOOK_FORWARD_URL" v={st.config.webhookForwardUrl ? <div style={sx(mono)}>{st.config.webhookForwardUrl}</div> : <span style={sx("color:#8B9A90")}>trống — không chuyển tiếp webhook sang hệ thống khác</span>} />
              {st.config.hasLegacyStaticToken && <Row k="ZALO_OA_TOKEN_MAIN" v={<span style={sx("color:#8B5A00")}>token tĩnh cũ — chỉ dùng khi chưa kết nối OA; nên xoá</span>} />}
              {st.config.hasBootstrapRefreshToken && <Row k="ZALO_OA_REFRESH_TOKEN" v={<span style={sx("color:#8B5A00")}>{st.connected ? "đã bootstrap vào DB — xoá biến này" : "sẽ bootstrap ở lần làm mới đầu"}</span>} />}
              {started && <Row k="code_challenge (PKCE)" v={<div style={sx("display:flex; gap:8px; align-items:center")}><div style={sx(mono)}>{started.codeChallenge}</div><Copy value={started.codeChallenge} /></div>} />}
            </div>
            <div style={sx("font-size:12px; color:#8B9A90; line-height:1.6; margin-bottom:12px")}>
              Webhook: developers.zalo.me → app → <b>Webhook</b> → dán Webhook URL → tick <i>user_send_text</i> (+ <i>follow</i>) → Lưu (web luôn trả 200). Cần xác thực domain trước bằng file <span style={sx("font-family:monospace")}>zalo_verifier….html</span> trong <span style={sx("font-family:monospace")}>public/</span>. Chi tiết: <span style={sx("font-family:monospace")}>docs/zalo-oa.md</span>.
            </div>
            <div style={sx("display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px")}>
              {!shared && <HButton s={`${ghost} ${!st.connected || busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={refresh}>{busy === "refresh" ? "Đang làm mới…" : "↻ Làm mới token ngay"}</HButton>}
              {!shared && st.connected && <HButton s={`${danger} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={disconnect}>Ngắt kết nối (xoá token)</HButton>}
            </div>
            <div style={sx("display:flex; gap:8px; flex-wrap:wrap")}>
              <div style={sx("flex:1; min-width:200px")}><HInput s={`${inp} height:34px`} focus={focus} value={devTest.userId} onChange={(e) => setDevTest({ ...devTest, userId: e.target.value })} placeholder="Gửi thử tới user_id / SĐT bất kỳ" /></div>
              <div style={sx("flex:2; min-width:200px")}><HInput s={`${inp} height:34px`} focus={focus} value={devTest.text} onChange={(e) => setDevTest({ ...devTest, text: e.target.value })} placeholder="Nội dung (trống = mặc định)" /></div>
              <HButton s={`${ghost} ${!st.connected || busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={devSend}>{busy === "devtest" ? "…" : "📨 Gửi"}</HButton>
            </div>

            {shared && (
              <div style={sx("margin-top:14px")}>
                <div style={sx("font-size:12.5px; font-weight:600; color:#3C4A40; margin-bottom:6px")}>Người đã liên kết Zalo bên worker Go (zalo_user_bindings):</div>
                <div style={sx("border:1px solid #D3DCE3; border-radius:10px; overflow:auto")}>
                  <table style={sx("width:100%; border-collapse:collapse; min-width:600px")}>
                    <thead><tr><th style={sx(gth)}>Tài khoản Go</th><th style={sx(gth)}>Zalo user_id</th><th style={sx(gth)}>Liên kết lúc</th><th style={sx(gth + "; text-align:center")}>Ở web này</th></tr></thead>
                    <tbody>
                      {sharedUsers.length === 0 && <tr><td colSpan={4} style={sx(gtd + "; text-align:center; color:#8B9A90; padding:16px")}>{st.sharedError || "Bên Go chưa có ai liên kết."}</td></tr>}
                      {sharedUsers.map((u, i) => (
                        <tr key={u.zaloUserId} style={sx(`background:${i % 2 ? "#FBFDFB" : "#fff"}`)}>
                          <td style={sx(gtd + "; font-weight:600")}>{u.name || <span style={sx("color:#8B9A90; font-weight:400")}>user #{u.userId}</span>}</td>
                          <td style={sx(gtd + "; font-family:monospace")}>{u.zaloUserId}</td>
                          <td style={sx(gtd + "; white-space:nowrap; color:#7B8A80")}>{fmtDate(u.linkedAt)}</td>
                          <td style={sx(gtd + "; text-align:center; white-space:nowrap")}>{u.receiveChannel ? <Badge ok={u.receiveChannel.isActive} yes={`✓ ${u.receiveChannel.name}`} no={`Tắt: ${u.receiveChannel.name}`} /> : <HButton s={`${small} ${busy ? "opacity:.6; pointer-events:none" : ""}`} onClick={() => addFromSender(u.zaloUserId, u.name)}>+ Thêm vào danh sách</HButton>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {confirm && (
        <div style={sx("position:fixed; inset:0; z-index:70; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setConfirm(null)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:420px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("font-size:17px; font-weight:700; color:#14261A; margin-bottom:8px")}>Xác nhận</div>
            <div style={sx("font-size:13.5px; line-height:1.55; color:#4A5A4E; margin-bottom:18px")}>{confirm.text}</div>
            <div style={sx("display:flex; gap:10px")}>
              <HButton s="flex:1; height:44px; border:none; border-radius:11px; background:#B3261E; color:#fff; font-size:14px; font-weight:600; cursor:pointer" onClick={runConfirm}>Đồng ý</HButton>
              <HButton s={`${ghost} height:44px`} onClick={() => setConfirm(null)}>Hủy</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
