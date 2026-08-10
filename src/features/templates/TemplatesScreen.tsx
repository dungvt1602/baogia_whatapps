"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sx, HButton, HInput, HTextarea } from "@/components/common/ui";
import {
  getJSON,
  postJSON,
  patchJSON,
  sendJSON,
} from "@/components/common/api";

type Tpl = {
  id: string;
  name: string;
  icon: string | null;
  waTemplateName: string | null;
  quotation: { id: string; code: string; title: string | null } | null;
  channel: { id: string; name: string; type: string } | null;
  _count: { customerLinks: number };
};
type TplDetail = {
  id: string;
  name: string;
  icon: string | null;
  body: string | null;
  waTemplateName: string | null;
  waLanguage: string;
  waCategory: string | null;
  waImage: boolean;
  createdAt: string;
  quotation: {
    id: string;
    code: string;
    title: string | null;
    market: string | null;
    currency: string;
    totalAmount: unknown;
    validUntil: string | null;
  } | null;
  channel: { id: string; name: string; type: string; accountId: string } | null;
  image: { mime: string; updatedAt: string } | null;
  _count: { customerLinks: number };
};
type Cust = {
  id: string;
  name: string;
  whatsappPhone: string | null;
  phone: string | null;
  status: string;
  receiveQuotation: boolean;
  market?: string | null;
  template?: { id: string; name: string } | null;
};
type Ch = { id: string; name: string; type: string };
type TplForm = {
  id?: string;
  name: string;
  icon: string;
  body: string;
  channelId: string;
  waTemplateName: string;
  waLanguage: string;
  waCategory: string;
};

const card =
  "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px";
const inp =
  "height:38px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green =
  "border:none; border-radius:9px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 14px; height:36px;";
const ghost =
  "border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";

const money = (v: unknown, cur: string) =>
  `${Number(v ?? 0).toLocaleString("vi-VN")} ${cur}`;
const fmtDate = (s: string | null) =>
  s
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(s))
    : "—";

// Ô thông tin nhỏ
function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={sx(
        "background:#F7FAF7; border:1px solid #EEF2EE; border-radius:12px; padding:12px 14px",
      )}
    >
      <div
        style={sx(
          "font-size:11.5px; color:#8B9A90; font-weight:600; text-transform:uppercase; letter-spacing:.04em",
        )}
      >
        {label}
      </div>
      <div
        style={sx(
          "font-size:15px; font-weight:700; color:#14261A; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
        )}
      >
        {value}
      </div>
      {sub && (
        <div style={sx("font-size:12px; color:#7B8A80; margin-top:2px")}>
          {sub}
        </div>
      )}
    </div>
  );
}

// Render nội dung tin nhắn, tô sáng biến {…}
function renderBody(body: string) {
  return body.split(/(\{[^}]+\})/g).map((part, i) =>
    part.startsWith("{") && part.endsWith("}") ? (
      <span
        key={i}
        style={sx(
          "background:#EAF3EC; color:#1F7440; border-radius:6px; padding:1px 6px; font-weight:600",
        )}
      >
        {part}
      </span>
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
  const [channels, setChannels] = useState<Ch[]>([]);
  const [form, setForm] = useState<TplForm | null>(null); // tạo/sửa template
  const [delT, setDelT] = useState<{ id: string; name: string } | null>(null); // xác nhận xóa template
  const [search, setSearch] = useState(""); // tìm kiếm danh sách
  const [lpage, setLpage] = useState(1); // trang danh sách
  const [err, setErr] = useState("");

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await getJSON<Tpl[]>("/api/templates"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    (async () => {
      await loadTemplates();
    })();
  }, [loadTemplates]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await getJSON<TplDetail>(`/api/templates/${id}`));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  const loadCustomers = useCallback(async (id: string) => {
    try {
      setCustomers(await getJSON<Cust[]>(`/api/templates/${id}/customers`));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  const openDetail = (id: string) => router.push(`/template/${id}`);
  const backToList = () => router.push("/template");

  // Tải chi tiết + khách khi id trên URL đổi
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selT) {
        if (!cancelled) {
          setDetail(null);
          setCustomers([]);
        }
        return;
      }
      if (!cancelled) {
        setErr("");
        setDetail(null);
        setCustomers([]);
      }
      await Promise.all([loadDetail(selT), loadCustomers(selT)]);
    })();
    return () => {
      cancelled = true;
    };
  }, [selT, loadDetail, loadCustomers]);

  const refresh = useCallback(async () => {
    if (!selT) return;
    await Promise.all([loadCustomers(selT), loadDetail(selT), loadTemplates()]);
  }, [selT, loadCustomers, loadDetail, loadTemplates]);

  async function removeFromTemplate(customerId: string) {
    setErr("");
    try {
      await sendJSON("DELETE", `/api/templates/${selT}/customers/${customerId}`);
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  // ---- Tạo / sửa / xóa template ----
  function openCreate() {
    getJSON<Ch[]>("/api/channels")
      .then(setChannels)
      .catch(() => {});
    setForm({
      name: "",
      icon: "🌐",
      body: "",
      channelId: "",
      waTemplateName: "",
      waLanguage: "vi",
      waCategory: "MARKETING",
    });
  }
  async function openEdit() {
    if (!detail) return;
    getJSON<Ch[]>("/api/channels")
      .then(setChannels)
      .catch(() => {});
    setForm({
      id: detail.id,
      name: detail.name,
      icon: detail.icon || "🌐",
      body: detail.body || "",
      channelId: detail.channel?.id || "",
      waTemplateName: detail.waTemplateName || "",
      waLanguage: detail.waLanguage || "vi",
      waCategory: detail.waCategory || "MARKETING",
    });
  }
  async function saveForm() {
    if (!form?.name) return setErr("Nhập tên hiển thị");
    if (!form?.waTemplateName)
      return setErr("Nhập tên template Meta (đã duyệt trên WhatsApp Manager)");
    setErr("");
    const body = {
      name: form.name,
      icon: form.icon,
      body: form.body,
      channelId: form.channelId || null,
      waTemplateName: form.waTemplateName,
      waLanguage: form.waLanguage,
      waCategory: form.waCategory,
    };
    try {
      if (form.id) {
        await patchJSON(`/api/templates/${form.id}`, body);
        await loadDetail(form.id);
      } else {
        const t = await postJSON<{ id: string }>("/api/templates", body);
        router.push(`/template/${t.id}`);
      }
      setForm(null);
      await loadTemplates();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function doDelete() {
    if (!delT) return;
    setErr("");
    try {
      await sendJSON("DELETE", `/api/templates/${delT.id}`);
      setDelT(null);
      await loadTemplates();
      router.push("/template");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  // ---- Ảnh header của template (upload/xóa) ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function onPickImage(file: File | undefined) {
    if (!file || !selT) return;
    if (!file.type.startsWith("image/")) return setErr("File phải là ảnh.");
    if (file.size > 5 * 1024 * 1024) return setErr("Ảnh quá lớn (tối đa 5MB).");
    setErr("");
    setUploading(true);
    try {
      const res = await fetch(`/api/templates/${selT}/image`, {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({})))?.error || `Lỗi ${res.status}`,
        );
      await loadDetail(selT);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function removeImage() {
    if (!selT) return;
    setErr("");
    try {
      await sendJSON("DELETE", `/api/templates/${selT}/image`);
      await loadDetail(selT);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const errBox = err ? (
    <div
      style={sx(
        "background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px",
      )}
    >
      {err}
    </div>
  ) : null;

  const lbl =
    "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";
  // Modal form dùng chung cho tạo & sửa
  const formModal = form && (
    <div
      style={sx(
        "position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:20px",
      )}
    >
      <div
        onClick={() => setForm(null)}
        style={sx(
          "position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)",
        )}
      />
      <div
        style={sx(
          "position:relative; width:100%; max-width:500px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)",
        )}
      >
        <div
          style={sx(
            "display:flex; align-items:center; gap:10px; margin-bottom:16px",
          )}
        >
          <div
            style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}
          >
            {form.id ? "Sửa template" : "Tạo template"}
          </div>
          <HButton
            s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E"
            onClick={() => setForm(null)}
          >
            ✕
          </HButton>
        </div>
        <div
          style={sx(
            "font-size:12px; color:#7B8A80; background:#F6F9F6; border:1px solid #E9EEE9; border-radius:10px; padding:10px 12px; margin-bottom:14px; line-height:1.5",
          )}
        >
          Template WhatsApp phải được{" "}
          <b>tạo & duyệt trên WhatsApp Manager (Meta)</b> trước. Ở đây chỉ khai{" "}
          <b>thông tin template Meta</b> — nội dung & biến do Meta quy định,
          không sửa ở app.
        </div>
        <div style={sx("display:flex; gap:10px")}>
          <div style={sx("width:90px")}>
            <label
              style={sx(
                "display:flex; flex-direction:column; margin-bottom:12px",
              )}
            >
              <span style={sx(lbl)}>Icon</span>
              <HInput
                s={inp}
                focus={focus}
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🌐"
              />
            </label>
          </div>
          <div style={sx("flex:1")}>
            <label
              style={sx(
                "display:flex; flex-direction:column; margin-bottom:12px",
              )}
            >
              <span style={sx(lbl)}>Tên hiển thị *</span>
              <HInput
                s={inp}
                focus={focus}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Báo giá Ấn Độ"
              />
            </label>
          </div>
        </div>
        <label
          style={sx("display:flex; flex-direction:column; margin-bottom:12px")}
        >
          <span style={sx(lbl)}>
            Tên template Meta * (đã duyệt trên WhatsApp Manager)
          </span>
          <HInput
            s={inp}
            focus={focus}
            value={form.waTemplateName}
            onChange={(e) =>
              setForm({ ...form, waTemplateName: e.target.value })
            }
            placeholder="daily_quotation_india_image"
          />
        </label>
        <div style={sx("display:flex; gap:10px")}>
          <div style={sx("width:110px")}>
            <label
              style={sx(
                "display:flex; flex-direction:column; margin-bottom:12px",
              )}
            >
              <span style={sx(lbl)}>Ngôn ngữ</span>
              <HInput
                s={inp}
                focus={focus}
                value={form.waLanguage}
                onChange={(e) =>
                  setForm({ ...form, waLanguage: e.target.value })
                }
                placeholder="vi"
              />
            </label>
          </div>
          <div style={sx("flex:1")}>
            <label
              style={sx(
                "display:flex; flex-direction:column; margin-bottom:12px",
              )}
            >
              <span style={sx(lbl)}>Danh mục (Meta)</span>
              <select
                value={form.waCategory}
                onChange={(e) =>
                  setForm({ ...form, waCategory: e.target.value })
                }
                style={sx(inp)}
              >
                <option value="MARKETING">MARKETING</option>
                <option value="UTILITY">UTILITY</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
              </select>
            </label>
          </div>
        </div>
        <label
          style={sx("display:flex; flex-direction:column; margin-bottom:12px")}
        >
          <span style={sx(lbl)}>Kênh gửi</span>
          <select
            value={form.channelId}
            onChange={(e) => setForm({ ...form, channelId: e.target.value })}
            style={sx(inp)}
          >
            <option value="">— chưa gắn —</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </label>
        <label
          style={sx("display:flex; flex-direction:column; margin-bottom:12px")}
        >
          <span style={sx(lbl)}>
            Nội dung template (dán từ Meta — chỉ để hiển thị)
          </span>
          <HTextarea
            s="border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:10px 11px; font-size:13.5px; line-height:1.5; color:#14261A; outline:none; resize:vertical; font-family:inherit; width:100%;"
            focus={focus}
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Kính gửi {{1}}, ... (copy đúng nội dung template trên Meta)"
          />
        </label>
        <div style={sx("display:flex; gap:10px; margin-top:6px")}>
          <HButton s={`${green} flex:1; height:44px`} onClick={saveForm}>
            {form.id ? "Lưu thay đổi" : "Tạo template"}
          </HButton>
          <HButton s={`${ghost} height:44px`} onClick={() => setForm(null)}>
            Hủy
          </HButton>
        </div>
      </div>
    </div>
  );
  // Modal xác nhận xóa
  const delModal = delT && (
    <div
      style={sx(
        "position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:20px",
      )}
    >
      <div
        onClick={() => setDelT(null)}
        style={sx(
          "position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)",
        )}
      />
      <div
        style={sx(
          "position:relative; width:100%; max-width:420px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)",
        )}
      >
        <div
          style={sx(
            "font-size:17px; font-weight:700; color:#14261A; margin-bottom:8px",
          )}
        >
          Xóa template?
        </div>
        <div
          style={sx(
            "font-size:13.5px; line-height:1.55; color:#4A5A4E; margin-bottom:18px",
          )}
        >
          Xóa hẳn <strong style={sx("color:#14261A")}>“{delT.name}”</strong>.
          Khách hàng của nó sẽ được đưa về kho (không bị xóa). Không thể hoàn
          tác.
        </div>
        <div style={sx("display:flex; gap:10px")}>
          <HButton
            s="flex:1; height:44px; border:none; border-radius:11px; background:#B3261E; color:#fff; font-size:14px; font-weight:600; cursor:pointer"
            onClick={doDelete}
          >
            Xóa template
          </HButton>
          <HButton s={`${ghost} height:44px`} onClick={() => setDelT(null)}>
            Hủy
          </HButton>
        </div>
      </div>
    </div>
  );

  // ---------- DANH SÁCH TEMPLATE ----------
  if (!selT) {
    const kw = search.trim().toLowerCase();
    const filtered = templates.filter(
      (t) =>
        !kw ||
        t.name.toLowerCase().includes(kw) ||
        (t.quotation?.code || "").toLowerCase().includes(kw),
    );
    const lTotal = Math.max(1, Math.ceil(filtered.length / 12));
    const lCur = Math.min(lpage, lTotal);
    const lPaged = filtered.slice((lCur - 1) * 12, lCur * 12);
    return (
      <div>
        {errBox}
        <div
          style={sx(
            "display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap",
          )}
        >
          <div style={sx("position:relative; width:260px")}>
            <span
              style={sx(
                "position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; color:#9AA7A0",
              )}
            >
              🔍
            </span>
            <HInput
              s="height:36px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px 0 32px; font-size:13.5px; color:#14261A; outline:none; width:100%;"
              focus={focus}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLpage(1);
              }}
              placeholder="Tìm tên template hoặc mã báo giá..."
            />
          </div>
          <div style={sx("font-size:13px; color:#7B8A80; flex:1")}>
            {filtered.length} template
          </div>
          <HButton s={green} onClick={openCreate}>
            + Tạo template
          </HButton>
        </div>
        {filtered.length === 0 && (
          <div style={sx(card + "; font-size:13px; color:#8B9A90")}>
            {templates.length === 0
              ? "Chưa có template. Bấm “+ Tạo template” để tạo mới."
              : "Không tìm thấy template khớp."}
          </div>
        )}
        <div
          style={sx(
            "display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:14px",
          )}
        >
          {lPaged.map((t) => (
            <HButton
              key={t.id}
              onClick={() => openDetail(t.id)}
              s="display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:#fff; border-width:1px; border-style:solid; border-color:#E9EEE9; border-radius:16px; padding:16px; cursor:pointer; transition:border-color .15s, box-shadow .15s"
              h="border-color:#3EA85C; box-shadow:0 12px 26px -16px rgba(31,116,64,.35)"
            >
              <div
                style={sx(
                  "width:44px; height:44px; border-radius:12px; background:#EAF3EC; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0",
                )}
              >
                {t.icon || "📄"}
              </div>
              <div style={sx("min-width:0; flex:1")}>
                <div
                  style={sx(
                    "font-size:15px; font-weight:700; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
                  )}
                >
                  {t.name}
                </div>
                <div
                  style={sx(
                    "font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
                  )}
                >
                  {t.quotation?.code || "—"} · {t._count.customerLinks} khách
                  {t.channel ? ` · ${t.channel.type}` : ""}
                </div>
              </div>
              <span style={sx("color:#B9C5BC; font-size:18px; flex-shrink:0")}>
                ›
              </span>
            </HButton>
          ))}
        </div>
        {lTotal > 1 && (
          <div
            style={sx(
              "display:flex; align-items:center; gap:8px; margin-top:14px",
            )}
          >
            <div style={sx("font-size:12.5px; color:#7B8A80; flex:1")}>
              Trang {lCur}/{lTotal}
            </div>
            <HButton
              s={`${ghost} ${lCur <= 1 ? "opacity:.45; pointer-events:none" : ""}`}
              onClick={() => setLpage(lCur - 1)}
            >
              ‹ Trước
            </HButton>
            <HButton
              s={`${ghost} ${lCur >= lTotal ? "opacity:.45; pointer-events:none" : ""}`}
              onClick={() => setLpage(lCur + 1)}
            >
              Sau ›
            </HButton>
          </div>
        )}
        {formModal}
      </div>
    );
  }

  // ---------- TRANG CHI TIẾT ----------
  const activeCount = customers.filter((c) => c.status === "ACTIVE").length;
  const receiveCount = customers.filter((c) => c.receiveQuotation).length;

  return (
    <div style={sx("max-width:960px")}>
      <HButton
        s="display:inline-flex; align-items:center; gap:7px; border:none; background:none; color:#2F8F4E; font-size:13.5px; font-weight:600; cursor:pointer; padding:0; margin-bottom:14px"
        onClick={backToList}
      >
        ‹ Danh sách template
      </HButton>
      {errBox}

      {/* Hero */}
      <div
        style={sx(
          "border-radius:18px; padding:24px; background:linear-gradient(130deg,#1F7440,#123E24); color:#fff; box-shadow:0 20px 44px -26px rgba(18,62,36,.7)",
        )}
      >
        <div style={sx("display:flex; align-items:center; gap:16px")}>
          <div
            style={sx(
              "width:60px; height:60px; border-radius:16px; background:rgba(255,255,255,.16); display:flex; align-items:center; justify-content:center; font-size:30px; flex-shrink:0",
            )}
          >
            {detail?.icon || "📄"}
          </div>
          <div style={sx("min-width:0; flex:1")}>
            <div
              style={sx(
                "font-size:24px; font-weight:700; letter-spacing:-0.02em",
              )}
            >
              {detail?.name || "…"}
            </div>
            <div style={sx("font-size:13.5px; color:#B7DBC4; margin-top:3px")}>
              {detail?.quotation?.code || ""}
              {detail?.quotation?.title ? ` · ${detail.quotation.title}` : ""}
            </div>
          </div>
          {detail?.channel && (
            <span
              style={sx(
                "font-size:12px; font-weight:700; background:rgba(255,255,255,.18); color:#fff; padding:6px 13px; border-radius:20px; white-space:nowrap",
              )}
            >
              {detail.channel.type}
            </span>
          )}
          <HButton
            s="height:34px; border:none; border-radius:9px; background:rgba(255,255,255,.18); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 14px; flex-shrink:0"
            onClick={openEdit}
          >
            Sửa
          </HButton>
          <HButton
            s="width:34px; height:34px; border:none; border-radius:9px; background:rgba(255,255,255,.14); color:#FFD9D6; font-size:15px; cursor:pointer; flex-shrink:0"
            title="Xóa template"
            onClick={() =>
              detail && setDelT({ id: detail.id, name: detail.name })
            }
          >
            🗑
          </HButton>
        </div>
      </div>

      {/* Thẻ thông tin */}
      <div
        style={sx(
          "display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:12px; margin-top:14px",
        )}
      >
        <Stat
          label="Báo giá"
          value={detail?.quotation?.code || "—"}
          sub={
            detail?.quotation
              ? money(detail.quotation.totalAmount, detail.quotation.currency)
              : undefined
          }
        />
        <Stat
          label="Thị trường"
          value={detail?.quotation?.market || "—"}
          sub={
            detail?.quotation?.validUntil
              ? `Hiệu lực đến ${fmtDate(detail.quotation.validUntil)}`
              : undefined
          }
        />
        <Stat
          label="Kênh gửi"
          value={detail?.channel?.name || "Chưa gắn"}
          sub={detail?.channel?.type}
        />
        <Stat
          label="Template Meta"
          value={detail?.waTemplateName || "— (chưa khai)"}
          sub={
            detail
              ? `${detail.waCategory || "—"} · ${detail.waLanguage}${detail.waImage ? " · kèm ảnh" : ""}`
              : undefined
          }
        />
        <Stat
          label="Khách nhận"
          value={`${customers.length} khách`}
          sub={`${activeCount} ACTIVE · ${receiveCount} nhận báo giá`}
        />
        <Stat
          label="Ngày tạo"
          value={detail ? fmtDate(detail.createdAt) : "—"}
        />
      </div>

      {/* Nội dung tin nhắn + Ảnh báo giá */}
      <div
        style={sx(
          "display:grid; grid-template-columns:repeat(auto-fit, minmax(300px,1fr)); gap:14px; margin-top:14px",
        )}
      >
        <div style={sx(card)}>
          <div
            style={sx(
              "display:flex; align-items:center; gap:8px; margin-bottom:12px",
            )}
          >
            <span
              style={sx(
                "width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)",
              )}
            />
            <div style={sx("font-size:15px; font-weight:700; color:#14261A")}>
              Nội dung template Meta
            </div>
          </div>
          <div
            style={sx(
              "background:#F6F9F6; border:1px solid #E9EEE9; border-radius:13px; padding:15px; font-size:13.5px; line-height:1.75; color:#3C4A40; white-space:pre-wrap",
            )}
          >
            {detail?.body ? (
              renderBody(detail.body)
            ) : (
              <span style={sx("color:#8B9A90")}>Chưa có nội dung.</span>
            )}
          </div>
          <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>
            Nội dung do Meta quy định (chỉ hiển thị). Khi gửi, WhatsApp dùng
            đúng template đã duyệt + tham số.
          </div>
        </div>

        <div style={sx(card)}>
          <div
            style={sx(
              "display:flex; align-items:center; gap:8px; margin-bottom:12px",
            )}
          >
            <span
              style={sx(
                "width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)",
              )}
            />
            <div
              style={sx(
                "font-size:15px; font-weight:700; color:#14261A; flex:1",
              )}
            >
              Ảnh header
            </div>
            {detail?.image && (
              <HButton
                s="height:30px; padding:0 10px; border:1px solid #E4C7C5; border-radius:8px; background:#fff; color:#B3261E; font-size:12.5px; font-weight:600; cursor:pointer"
                onClick={removeImage}
              >
                Xóa ảnh
              </HButton>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={sx("display:none")}
            onChange={(e) => onPickImage(e.target.files?.[0])}
          />
          {detail?.image ? (
            <>
              <img
                src={`/api/templates/${selT}/image?t=${encodeURIComponent(detail.image.updatedAt)}`}
                alt="Ảnh header"
                style={sx(
                  "width:100%; border:1px solid #E9EEE9; border-radius:12px; display:block",
                )}
              />
              <HButton
                s={`${ghost} margin-top:10px; width:100%`}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Đang tải..." : "Đổi ảnh"}
              </HButton>
            </>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              style={sx(
                "border:2px dashed #D5DED6; border-radius:13px; padding:28px 15px; text-align:center; cursor:pointer; background:#FAFCFA",
              )}
            >
              <div style={sx("font-size:30px; margin-bottom:6px")}>🖼️</div>
              <div
                style={sx("font-size:13.5px; font-weight:600; color:#3C4A40")}
              >
                {uploading ? "Đang tải..." : "Bấm để tải ảnh lên"}
              </div>
              <div style={sx("font-size:12px; color:#8B9A90; margin-top:3px")}>
                PNG/JPG, tối đa 5MB
              </div>
            </div>
          )}
          <div style={sx("font-size:11.5px; color:#8B9A90; margin-top:8px")}>
            Ảnh này gửi kèm làm header khi dùng WhatsApp template (giống bot).
          </div>
        </div>
      </div>

      {/* Khách hàng */}
      <div style={sx(card + "; margin-top:14px")}>
        <div
          style={sx(
            "display:flex; align-items:center; gap:10px; margin-bottom:12px",
          )}
        >
          <span
            style={sx(
              "width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)",
            )}
          />
          <div
            style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}
          >
            Khách hàng ({customers.length})
          </div>
          <HButton
            s={green}
            onClick={() => router.push(`/template/${selT}/khach-hang`)}
          >
            + Thêm khách hàng
          </HButton>
        </div>
        {customers.length === 0 && (
          <div style={sx("font-size:13px; color:#8B9A90")}>
            Chưa có khách. Bấm “Thêm khách hàng” để mở trang chọn khách.
          </div>
        )}
        <div
          style={sx(
            "display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:8px",
          )}
        >
          {customers.slice(0, 6).map((c) => (
            <div
              key={c.id}
              style={sx(
                "display:flex; align-items:center; gap:10px; border:1px solid #E9EEE9; border-radius:11px; padding:10px 12px",
              )}
            >
              <div
                style={sx(
                  "width:34px; height:34px; border-radius:50%; background:#EAF3EC; color:#1F7440; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0",
                )}
              >
                {c.name
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((x) => x[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div style={sx("min-width:0; flex:1")}>
                <div
                  style={sx(
                    "font-size:13.5px; font-weight:600; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
                  )}
                >
                  {c.name}
                </div>
                <div style={sx("font-size:12px; color:#8B9A90")}>
                  {c.whatsappPhone || c.phone || "(chưa có SĐT)"}
                </div>
              </div>
              <span
                style={sx(
                  `font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; background:${c.status === "ACTIVE" ? "#E7F5EC" : "#FDECEC"}; color:${c.status === "ACTIVE" ? "#1F7440" : "#B3261E"}`,
                )}
              >
                {c.status}
              </span>
              <HButton
                s="width:30px; height:30px; border:1px solid #E4C7C5; border-radius:8px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0"
                title="Đưa về kho"
                onClick={() => removeFromTemplate(c.id)}
              >
                ×
              </HButton>
            </div>
          ))}
        </div>
        {customers.length > 6 && (
          <HButton
            s="border:none; background:none; color:#2F8F4E; font-size:13px; font-weight:600; cursor:pointer; padding:10px 2px 0"
            onClick={() => router.push(`/template/${selT}/khach-hang`)}
          >
            Xem tất cả {customers.length} khách →
          </HButton>
        )}
      </div>

      {formModal}
      {delModal}
    </div>
  );
}
