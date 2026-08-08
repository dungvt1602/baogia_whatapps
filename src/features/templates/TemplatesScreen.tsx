"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON } from "@/components/common/api";

type Tpl = {
  id: string;
  name: string;
  icon: string | null;
  waTemplateName: string | null;
  quotation: { id: string; code: string; title: string | null } | null;
  channel: { id: string; name: string; type: string } | null;
  _count: { customers: number };
};
type TplDetail = {
  id: string;
  name: string;
  icon: string | null;
  body: string | null;
  waTemplateName: string | null;
  waLanguage: string;
  waImage: boolean;
  createdAt: string;
  quotation: { id: string; code: string; title: string | null; market: string | null; currency: string; totalAmount: unknown; validUntil: string | null } | null;
  channel: { id: string; name: string; type: string; accountId: string } | null;
  _count: { customers: number };
};
type Cust = {
  id: string;
  name: string;
  whatsappPhone: string | null;
  phone: string | null;
  status: string;
  receiveQuotation: boolean;
  template?: { id: string; name: string } | null;
};

const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px";
const inp = "height:38px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green = "border:none; border-radius:9px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 14px; height:36px;";
const ghost = "border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";

const money = (v: unknown, cur: string) => `${Number(v ?? 0).toLocaleString("vi-VN")} ${cur}`;
const fmtDate = (s: string | null) => (s ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s)) : "—");

// Ô thông tin nhỏ
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={sx("background:#F7FAF7; border:1px solid #EEF2EE; border-radius:12px; padding:12px 14px")}>
      <div style={sx("font-size:11.5px; color:#8B9A90; font-weight:600; text-transform:uppercase; letter-spacing:.04em")}>{label}</div>
      <div style={sx("font-size:15px; font-weight:700; color:#14261A; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{value}</div>
      {sub && <div style={sx("font-size:12px; color:#7B8A80; margin-top:2px")}>{sub}</div>}
    </div>
  );
}

// Render nội dung tin nhắn, tô sáng biến {…}
function renderBody(body: string) {
  return body.split(/(\{[^}]+\})/g).map((part, i) =>
    part.startsWith("{") && part.endsWith("}") ? (
      <span key={i} style={sx("background:#EAF3EC; color:#1F7440; border-radius:6px; padding:1px 6px; font-weight:600")}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function TemplatesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const m = pathname.match(/^\/template\/(.+)$/);
  const selT = m ? decodeURIComponent(m[1]) : ""; // id lấy TỪ URL

  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [detail, setDetail] = useState<TplDetail | null>(null);
  const [customers, setCustomers] = useState<Cust[]>([]);
  const [popup, setPopup] = useState(false);
  const [candidates, setCandidates] = useState<Cust[]>([]);
  const [newC, setNewC] = useState<{ name: string; whatsappPhone: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState("");

  const loadTemplates = useCallback(async () => {
    try { setTemplates(await getJSON<Tpl[]>("/api/templates")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const loadDetail = useCallback(async (id: string) => {
    try { setDetail(await getJSON<TplDetail>(`/api/templates/${id}`)); } catch (e) { setErr((e as Error).message); }
  }, []);
  const loadCustomers = useCallback(async (id: string) => {
    try { setCustomers(await getJSON<Cust[]>(`/api/templates/${id}/customers`)); } catch (e) { setErr((e as Error).message); }
  }, []);
  const loadCandidates = useCallback(async (id: string) => {
    try { setCandidates(await getJSON<Cust[]>(`/api/customers?excludeTemplate=${id}`)); } catch (e) { setErr((e as Error).message); }
  }, []);

  const openDetail = (id: string) => router.push(`/template/${id}`);
  const backToList = () => { setPopup(false); router.push("/template"); };

  // Tải chi tiết + khách khi id trên URL đổi
  useEffect(() => {
    if (!selT) { setDetail(null); setCustomers([]); return; }
    setErr(""); setDetail(null); setCustomers([]);
    loadDetail(selT); loadCustomers(selT);
  }, [selT, loadDetail, loadCustomers]);

  const refresh = useCallback(async () => {
    if (!selT) return;
    await Promise.all([loadCustomers(selT), loadCandidates(selT), loadDetail(selT), loadTemplates()]);
  }, [selT, loadCustomers, loadCandidates, loadDetail, loadTemplates]);

  async function addToTemplate(customerId: string) {
    setErr("");
    try { await patchJSON(`/api/customers/${customerId}`, { templateId: selT }); await refresh(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function removeFromTemplate(customerId: string) {
    setErr("");
    try { await patchJSON(`/api/customers/${customerId}`, { templateId: null }); await refresh(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function createCustomer() {
    if (!newC?.name) return setErr("Nhập tên khách");
    try { await postJSON("/api/customers", { ...newC, templateId: selT }); setNewC(null); await refresh(); }
    catch (e) { setErr((e as Error).message); }
  }
  function openPopup() { setPopup(true); loadCandidates(selT); }

  const errBox = err ? <div style={sx("background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px")}>{err}</div> : null;

  // ---------- DANH SÁCH TEMPLATE ----------
  if (!selT) {
    return (
      <div>
        {errBox}
        {templates.length === 0 && <div style={sx(card + "; font-size:13px; color:#8B9A90")}>Chưa có template. Tạo ở màn “Quản lý”.</div>}
        <div style={sx("display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:14px")}>
          {templates.map((t) => (
            <HButton key={t.id} onClick={() => openDetail(t.id)}
              s="display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:#fff; border-width:1px; border-style:solid; border-color:#E9EEE9; border-radius:16px; padding:16px; cursor:pointer; transition:border-color .15s, box-shadow .15s"
              h="border-color:#3EA85C; box-shadow:0 12px 26px -16px rgba(31,116,64,.35)">
              <div style={sx("width:44px; height:44px; border-radius:12px; background:#EAF3EC; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0")}>{t.icon || "📄"}</div>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:15px; font-weight:700; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{t.name}</div>
                <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{t.quotation?.code || "—"} · {t._count.customers} khách{t.channel ? ` · ${t.channel.type}` : ""}</div>
              </div>
              <span style={sx("color:#B9C5BC; font-size:18px; flex-shrink:0")}>›</span>
            </HButton>
          ))}
        </div>
      </div>
    );
  }

  // ---------- TRANG CHI TIẾT ----------
  const activeCount = customers.filter((c) => c.status === "ACTIVE").length;
  const receiveCount = customers.filter((c) => c.receiveQuotation).length;

  return (
    <div style={sx("max-width:960px")}>
      <HButton s="display:inline-flex; align-items:center; gap:7px; border:none; background:none; color:#2F8F4E; font-size:13.5px; font-weight:600; cursor:pointer; padding:0; margin-bottom:14px" onClick={backToList}>‹ Danh sách template</HButton>
      {errBox}

      {/* Hero */}
      <div style={sx("border-radius:18px; padding:24px; background:linear-gradient(130deg,#1F7440,#123E24); color:#fff; box-shadow:0 20px 44px -26px rgba(18,62,36,.7)")}>
        <div style={sx("display:flex; align-items:center; gap:16px")}>
          <div style={sx("width:60px; height:60px; border-radius:16px; background:rgba(255,255,255,.16); display:flex; align-items:center; justify-content:center; font-size:30px; flex-shrink:0")}>{detail?.icon || "📄"}</div>
          <div style={sx("min-width:0; flex:1")}>
            <div style={sx("font-size:24px; font-weight:700; letter-spacing:-0.02em")}>{detail?.name || "…"}</div>
            <div style={sx("font-size:13.5px; color:#B7DBC4; margin-top:3px")}>{detail?.quotation?.code || ""}{detail?.quotation?.title ? ` · ${detail.quotation.title}` : ""}</div>
          </div>
          {detail?.channel && <span style={sx("font-size:12px; font-weight:700; background:rgba(255,255,255,.18); color:#fff; padding:6px 13px; border-radius:20px; white-space:nowrap")}>{detail.channel.type}</span>}
        </div>
      </div>

      {/* Thẻ thông tin */}
      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:12px; margin-top:14px")}>
        <Stat label="Báo giá" value={detail?.quotation?.code || "—"} sub={detail?.quotation ? money(detail.quotation.totalAmount, detail.quotation.currency) : undefined} />
        <Stat label="Thị trường" value={detail?.quotation?.market || "—"} sub={detail?.quotation?.validUntil ? `Hiệu lực đến ${fmtDate(detail.quotation.validUntil)}` : undefined} />
        <Stat label="Kênh gửi" value={detail?.channel?.name || "Chưa gắn"} sub={detail?.channel?.type} />
        <Stat label="WhatsApp template" value={detail?.waTemplateName || "— (gửi text)"} sub={detail ? `Ngôn ngữ ${detail.waLanguage}${detail.waImage ? " · kèm ảnh" : ""}` : undefined} />
        <Stat label="Khách nhận" value={`${customers.length} khách`} sub={`${activeCount} ACTIVE · ${receiveCount} nhận báo giá`} />
        <Stat label="Ngày tạo" value={detail ? fmtDate(detail.createdAt) : "—"} />
      </div>

      {/* Nội dung tin nhắn + Ảnh báo giá */}
      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(300px,1fr)); gap:14px; margin-top:14px")}>
        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
            <span style={sx("width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)")} />
            <div style={sx("font-size:15px; font-weight:700; color:#14261A")}>Nội dung tin nhắn</div>
          </div>
          <div style={sx("background:#F6F9F6; border:1px solid #E9EEE9; border-radius:13px; padding:15px; font-size:13.5px; line-height:1.75; color:#3C4A40; white-space:pre-wrap")}>
            {detail?.body ? renderBody(detail.body) : <span style={sx("color:#8B9A90")}>Chưa có nội dung.</span>}
          </div>
          <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Biến trong ngoặc sẽ tự điền theo báo giá & khách khi gửi.</div>
        </div>

        <div style={sx(card)}>
          <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
            <span style={sx("width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)")} />
            <div style={sx("font-size:15px; font-weight:700; color:#14261A")}>Ảnh báo giá</div>
          </div>
          {detail?.quotation ? (
            <img src={`/api/quotations/${detail.quotation.id}/image`} alt="Ảnh báo giá" style={sx("width:100%; border:1px solid #E9EEE9; border-radius:12px; display:block")} />
          ) : (
            <div style={sx("font-size:13px; color:#8B9A90")}>Chưa gắn báo giá.</div>
          )}
          <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>Ảnh tự sinh từ sản phẩm của báo giá, gửi kèm khi dùng WhatsApp template.</div>
        </div>
      </div>

      {/* Khách hàng */}
      <div style={sx(card + "; margin-top:14px")}>
        <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:12px")}>
          <span style={sx("width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)")} />
          <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Khách hàng ({customers.length})</div>
          <HButton s={green} onClick={openPopup}>+ Thêm khách hàng</HButton>
        </div>
        {customers.length === 0 && <div style={sx("font-size:13px; color:#8B9A90")}>Chưa có khách. Bấm “Thêm khách hàng” để kéo từ kho vào.</div>}
        <div style={sx("display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:8px")}>
          {customers.map((c) => (
            <div key={c.id} style={sx("display:flex; align-items:center; gap:10px; border:1px solid #E9EEE9; border-radius:11px; padding:10px 12px")}>
              <div style={sx("width:34px; height:34px; border-radius:50%; background:#EAF3EC; color:#1F7440; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0")}>{c.name.trim().split(/\s+/).slice(-2).map((x) => x[0]).join("").toUpperCase()}</div>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:13.5px; font-weight:600; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{c.name}</div>
                <div style={sx("font-size:12px; color:#8B9A90")}>{c.whatsappPhone || c.phone || "(chưa có SĐT)"}</div>
              </div>
              <span style={sx(`font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; background:${c.status === "ACTIVE" ? "#E7F5EC" : "#FDECEC"}; color:${c.status === "ACTIVE" ? "#1F7440" : "#B3261E"}`)}>{c.status}</span>
              <HButton s="width:30px; height:30px; border:1px solid #E4C7C5; border-radius:8px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0" title="Đưa về kho" onClick={() => removeFromTemplate(c.id)}>×</HButton>
            </div>
          ))}
        </div>
      </div>

      {/* Popup thêm khách từ kho */}
      {popup && (
        <div style={sx("position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px")}>
          <div onClick={() => setPopup(false)} style={sx("position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)")} />
          <div style={sx("position:relative; width:100%; max-width:760px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:22px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)")}>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:6px")}>
              <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Thêm khách vào “{detail?.name}”</div>
              <HButton s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E" onClick={() => setPopup(false)}>✕</HButton>
            </div>
            <div style={sx("font-size:12.5px; color:#8B9A90; margin-bottom:14px")}>Kéo khách từ cột trái thả vào cột phải, hoặc bấm “＋”. Khách đang ở template khác sẽ được chuyển sang.</div>

            <div style={sx("display:grid; grid-template-columns:1fr 1fr; gap:12px")}>
              <div style={sx("border:1px solid #E9EEE9; border-radius:12px; padding:12px; display:flex; flex-direction:column")}>
                <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:10px")}>
                  <div style={sx("font-size:13.5px; font-weight:700; color:#14261A; flex:1")}>Khách khả dụng</div>
                  <HButton s={ghost} onClick={() => setNewC(newC ? null : { name: "", whatsappPhone: "" })}>{newC ? "Đóng" : "+ Khách mới"}</HButton>
                </div>
                {newC && (
                  <div style={sx("border:1px dashed #CFE0D4; border-radius:10px; padding:10px; margin-bottom:10px; background:#F8FBF8")}>
                    <HInput s={`${inp} margin-bottom:8px`} focus={focus} value={newC.name} onChange={(e) => setNewC({ ...newC, name: e.target.value })} placeholder="Tên khách" />
                    <HInput s={`${inp} margin-bottom:8px`} focus={focus} value={newC.whatsappPhone} onChange={(e) => setNewC({ ...newC, whatsappPhone: e.target.value })} placeholder="Số WhatsApp" />
                    <HButton s={`${green} width:100%`} onClick={createCustomer}>Tạo & thêm vào template</HButton>
                  </div>
                )}
                <div style={sx("display:flex; flex-direction:column; gap:6px; max-height:44vh; overflow:auto")}>
                  {candidates.length === 0 && <div style={sx("font-size:12.5px; color:#8B9A90")}>Không còn khách nào trong kho.</div>}
                  {candidates.map((c) => (
                    <div key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                      style={sx("display:flex; align-items:center; gap:8px; border:1px solid #E9EEE9; border-radius:10px; padding:9px 10px; cursor:grab; background:#fff")}>
                      <div style={sx("min-width:0; flex:1")}>
                        <div style={sx("font-size:13px; font-weight:600; color:#14261A")}>{c.name}</div>
                        <div style={sx("font-size:11.5px; color:#8B9A90")}>{c.whatsappPhone || c.phone || "—"} · {c.template ? `ở: ${c.template.name}` : "trong kho"}</div>
                      </div>
                      <HButton s="width:28px; height:28px; border:none; border-radius:8px; background:#EAF3EC; color:#1F7440; font-size:16px; cursor:pointer; flex-shrink:0" onClick={() => addToTemplate(c.id)}>＋</HButton>
                    </div>
                  ))}
                </div>
              </div>

              <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const id = e.dataTransfer.getData("text/plain"); if (id) addToTemplate(id); }}
                style={sx(`border:2px dashed ${dragOver ? "#3EA85C" : "#D5DED6"}; border-radius:12px; padding:12px; background:${dragOver ? "#F0F7F1" : "#FAFCFA"}; display:flex; flex-direction:column`)}>
                <div style={sx("font-size:13.5px; font-weight:700; color:#14261A; margin-bottom:10px")}>Trong “{detail?.name}” ({customers.length}) — thả vào đây</div>
                <div style={sx("display:flex; flex-direction:column; gap:6px; max-height:48vh; overflow:auto; flex:1; min-height:80px")}>
                  {customers.length === 0 && <div style={sx("font-size:12.5px; color:#8B9A90")}>Kéo khách vào đây...</div>}
                  {customers.map((c) => (
                    <div key={c.id} style={sx("display:flex; align-items:center; gap:8px; border:1px solid #E9EEE9; border-radius:10px; padding:9px 10px; background:#fff")}>
                      <div style={sx("min-width:0; flex:1")}>
                        <div style={sx("font-size:13px; font-weight:600; color:#14261A")}>{c.name}</div>
                        <div style={sx("font-size:11.5px; color:#8B9A90")}>{c.whatsappPhone || c.phone || "—"}</div>
                      </div>
                      <HButton s="width:26px; height:26px; border:1px solid #E4C7C5; border-radius:8px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0" onClick={() => removeFromTemplate(c.id)}>×</HButton>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={sx("display:flex; justify-content:flex-end; margin-top:16px")}>
              <HButton s={green} onClick={() => setPopup(false)}>Xong</HButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
