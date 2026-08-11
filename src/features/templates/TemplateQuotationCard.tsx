"use client";

// Card "Báo giá" nằm trong trang chi tiết template.
// Sau khi luồng gửi bỏ bước chọn báo giá, template là đơn vị thao tác duy nhất —
// nên báo giá (bảng giá của template) được quản lý luôn tại đây thay vì ở menu riêng.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sx, HButton, HInput } from "@/components/common/ui";
import { getJSON, postJSON, patchJSON, putJSON } from "@/components/common/api";
import { toast } from "sonner";

export type TplQuotationItem = {
  id: string;
  no: number;
  product: string;
  packing: string | null;
  unit: string | null;
  quantity: unknown;
  price: unknown;
};
export type TplQuotation = {
  id: string;
  code: string;
  title: string | null;
  market: string | null;
  currency: string;
  totalAmount: unknown;
  status: string;
  validUntil: string | null;
  issuedDate: string | null;
  items: TplQuotationItem[];
  _count: { templates: number };
};

// Báo giá trong danh sách để chọn (GET /api/quotations)
type QLite = {
  id: string;
  code: string;
  title: string | null;
  market: string | null;
  currency: string;
  totalAmount: unknown;
  _count: { templates: number };
};

type QForm = {
  id?: string;
  code: string;
  title: string;
  market: string;
  currency: string;
  issuedDate: string;
  validUntil: string;
};
type EditItem = { product: string; packing: string; unit: string; quantity: string; price: string };

const card = "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px";
const inp =
  "height:38px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; outline:none; width:100%;";
const focus = "border-color:#3EA85C; box-shadow:0 0 0 3px rgba(62,168,92,.14)";
const green =
  "border:none; border-radius:9px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13px; font-weight:600; cursor:pointer; padding:0 14px; height:36px;";
const ghost =
  "border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer; padding:0 12px; height:34px;";
const lbl = "font-size:12px; font-weight:600; color:#3C4A40; margin-bottom:4px";
const overlay = "position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)";
const modalWrap = "position:fixed; inset:0; z-index:75; display:flex; align-items:center; justify-content:center; padding:20px";

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const money = (v: unknown, cur: string) => `${num(v).toLocaleString("vi-VN")} ${cur}`;
const fmtDate = (s: string | null) =>
  s ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s)) : "—";
// ISO -> "YYYY-MM-DD" cho <input type="date">
const dInput = (s: string | null) => (s ? s.slice(0, 10) : "");

const cell = (flex: number, align: "flex-start" | "flex-end" | "center") =>
  `display:flex; flex:${flex}; justify-content:${align}; align-items:center; padding:0 10px`;

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={sx("background:#F7FAF7; border:1px solid #EEF2EE; border-radius:12px; padding:10px 12px")}>
      <div
        style={sx(
          "font-size:11px; color:#8B9A90; font-weight:600; text-transform:uppercase; letter-spacing:.04em",
        )}
      >
        {label}
      </div>
      <div
        style={sx(
          "font-size:14px; font-weight:700; color:#14261A; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
        )}
      >
        {value}
      </div>
      {sub && <div style={sx("font-size:11.5px; color:#7B8A80; margin-top:2px")}>{sub}</div>}
    </div>
  );
}

export default function TemplateQuotationCard({
  templateId,
  quotation,
  onChanged,
}: {
  templateId: string;
  quotation: TplQuotation | null;
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<QForm | null>(null); // modal tạo/sửa thông tin báo giá
  const [items, setItems] = useState<EditItem[] | null>(null); // modal sửa mặt hàng
  const [picker, setPicker] = useState(false); // modal chọn báo giá có sẵn
  const [list, setList] = useState<QLite[]>([]);
  const [confirmDetach, setConfirmDetach] = useState(false);
  const [busy, setBusy] = useState(false);

  const cur = quotation?.currency || "VND";
  const shared = (quotation?._count.templates ?? 0) > 1;

  // ---- Gắn / gỡ báo giá khỏi template ----
  async function attach(quotationId: string | null) {
    setBusy(true);
    try {
      await patchJSON(`/api/templates/${templateId}`, { quotationId });
      setPicker(false);
      setConfirmDetach(false);
      await onChanged();
      toast.success(quotationId ? "Đã gắn báo giá vào template" : "Đã gỡ báo giá khỏi template");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openPicker() {
    setPicker(true);
    getJSON<QLite[]>("/api/quotations")
      .then(setList)
      .catch((e) => toast.error((e as Error).message));
  }

  // ---- Tạo mới / sửa thông tin ----
  function openCreate() {
    setForm({ code: "", title: "", market: "", currency: "VND", issuedDate: "", validUntil: "" });
  }
  function openEdit() {
    if (!quotation) return;
    setForm({
      id: quotation.id,
      code: quotation.code,
      title: quotation.title || "",
      market: quotation.market || "",
      currency: quotation.currency,
      issuedDate: dInput(quotation.issuedDate),
      validUntil: dInput(quotation.validUntil),
    });
  }
  async function saveForm() {
    if (!form) return;
    const payload = {
      title: form.title,
      market: form.market,
      currency: form.currency,
      issuedDate: form.issuedDate,
      validUntil: form.validUntil,
    };
    setBusy(true);
    try {
      if (form.id) {
        if (!form.code.trim()) return toast.error("Nhập mã báo giá");
        await patchJSON(`/api/quotations/${form.id}`, { ...payload, code: form.code });
      } else {
        // Tạo báo giá riêng cho template này rồi gắn luôn — tránh sửa nhầm giá của template khác.
        const q = await postJSON<{ id: string }>("/api/quotations", { ...payload, code: form.code });
        await patchJSON(`/api/templates/${templateId}`, { quotationId: q.id });
      }
      setForm(null);
      await onChanged();
      toast.success(form.id ? "Đã lưu thông tin báo giá" : "Đã tạo và gắn báo giá");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---- Sửa bảng mặt hàng ----
  function openItems() {
    const rows = quotation?.items ?? [];
    setItems(
      rows.length
        ? rows.map((r) => ({
            product: r.product,
            packing: r.packing || "",
            unit: r.unit || "",
            quantity: String(num(r.quantity)),
            price: String(num(r.price)),
          }))
        : [{ product: "", packing: "", unit: "", quantity: "1", price: "0" }],
    );
  }
  async function saveItems() {
    if (!quotation || !items) return;
    setBusy(true);
    try {
      const rows = items.filter((i) => i.product.trim()).map((i, idx) => ({ no: idx + 1, ...i }));
      await putJSON(`/api/quotations/${quotation.id}/items`, { items: rows });
      setItems(null);
      await onChanged();
      toast.success("Đã lưu mặt hàng báo giá");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const patchItem = (i: number, p: Partial<EditItem>) =>
    setItems((rows) => (rows ? rows.map((x, j) => (j === i ? { ...x, ...p } : x)) : rows));

  // ================= Modal: thông tin báo giá =================
  const formModal = form && (
    <div style={sx(modalWrap)}>
      <div onClick={() => setForm(null)} style={sx(overlay)} />
      <div
        style={sx(
          "position:relative; width:100%; max-width:520px; max-height:92vh; overflow:auto; background:#fff; border-radius:20px; padding:22px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)",
        )}
      >
        <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:14px")}>
          <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>
            {form.id ? "Sửa thông tin báo giá" : "Tạo báo giá cho template này"}
          </div>
          <HButton
            s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E"
            onClick={() => setForm(null)}
          >
            ✕
          </HButton>
        </div>

        <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
          <span style={sx(lbl)}>Mã báo giá {form.id ? "*" : ""}</span>
          <HInput
            s={inp}
            focus={focus}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder={form.id ? "BG-2026-0001" : "Để trống = tự sinh BG-<năm>-<số>"}
          />
        </label>
        <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
          <span style={sx(lbl)}>Tiêu đề</span>
          <HInput
            s={inp}
            focus={focus}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="VD: Bảng giá trái cây tuần 33"
          />
        </label>
        <div style={sx("display:flex; gap:10px")}>
          <div style={sx("flex:1")}>
            <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
              <span style={sx(lbl)}>Thị trường</span>
              <HInput
                s={inp}
                focus={focus}
                value={form.market}
                onChange={(e) => setForm({ ...form, market: e.target.value })}
                placeholder="INDIA / UAE / NOI_DIA"
              />
            </label>
          </div>
          <div style={sx("width:120px")}>
            <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
              <span style={sx(lbl)}>Tiền tệ</span>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={sx(inp)}
              >
                {!["VND", "USD", "EUR"].includes(form.currency) && (
                  <option value={form.currency}>{form.currency}</option>
                )}
                <option value="VND">VND</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>
        </div>
        <div style={sx("display:flex; gap:10px")}>
          <div style={sx("flex:1")}>
            <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
              <span style={sx(lbl)}>Ngày phát hành</span>
              <HInput
                s={inp}
                focus={focus}
                type="date"
                value={form.issuedDate}
                onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
              />
            </label>
          </div>
          <div style={sx("flex:1")}>
            <label style={sx("display:flex; flex-direction:column; margin-bottom:12px")}>
              <span style={sx(lbl)}>Hiệu lực đến</span>
              <HInput
                s={inp}
                focus={focus}
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </label>
          </div>
        </div>
        <div style={sx("font-size:11.5px; color:#7B8A80; margin-bottom:14px; line-height:1.45")}>
          Hiệu lực hiển thị trong tin nhắn qua biến <b>{"{hiệu lực}"}</b>. Mặt hàng &amp; giá sửa ở bảng bên dưới.
        </div>
        <div style={sx("display:flex; gap:10px")}>
          <HButton s={`${green} flex:1; height:44px; opacity:${busy ? ".6" : "1"}`} onClick={saveForm}>
            {form.id ? "Lưu thay đổi" : "Tạo & gắn vào template"}
          </HButton>
          <HButton s={`${ghost} height:44px`} onClick={() => setForm(null)}>
            Hủy
          </HButton>
        </div>
      </div>
    </div>
  );

  // ================= Modal: sửa mặt hàng =================
  const itemsModal = items && (
    <div style={sx(modalWrap)}>
      <div onClick={() => setItems(null)} style={sx(overlay)} />
      <div
        style={sx(
          "position:relative; width:100%; max-width:820px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)",
        )}
      >
        <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:6px")}>
          <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>
            Mặt hàng — {quotation?.code}
          </div>
          <HButton
            s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E"
            onClick={() => setItems(null)}
          >
            ✕
          </HButton>
        </div>
        {shared && (
          <div
            style={sx(
              "font-size:12.5px; color:#B07208; background:#FDF6E7; border:1px solid #F3E3BE; border-radius:9px; padding:9px 12px; margin-bottom:12px; line-height:1.45",
            )}
          >
            Báo giá này đang gắn ở <b>{quotation?._count.templates} template</b> — sửa giá ở đây đổi cho tất cả.
          </div>
        )}
        <div style={sx("display:flex; flex-direction:column; gap:8px; margin-top:10px")}>
          {items.map((it, i) => (
            <div key={i} style={sx("display:flex; gap:6px; align-items:center")}>
              <span style={sx("width:20px; font-size:12px; color:#8B9A90; flex-shrink:0")}>{i + 1}</span>
              <HInput
                s={`${inp} flex:2.4`}
                focus={focus}
                value={it.product}
                onChange={(e) => patchItem(i, { product: e.target.value })}
                placeholder="Mặt hàng"
              />
              <HInput
                s={`${inp} flex:1.7`}
                focus={focus}
                value={it.packing}
                onChange={(e) => patchItem(i, { packing: e.target.value })}
                placeholder="Quy cách"
              />
              <HInput
                s={`${inp} flex:1`}
                focus={focus}
                value={it.unit}
                onChange={(e) => patchItem(i, { unit: e.target.value })}
                placeholder="ĐVT"
              />
              <HInput
                s={`${inp} flex:1`}
                focus={focus}
                value={it.quantity}
                onChange={(e) => patchItem(i, { quantity: e.target.value })}
                placeholder="SL"
              />
              <HInput
                s={`${inp} flex:1.4`}
                focus={focus}
                value={it.price}
                onChange={(e) => patchItem(i, { price: e.target.value })}
                placeholder="Đơn giá"
              />
              <HButton
                s="width:32px; height:38px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                ✕
              </HButton>
            </div>
          ))}
        </div>
        <HButton
          s={`${ghost} margin-top:10px`}
          onClick={() => setItems([...items, { product: "", packing: "", unit: "", quantity: "1", price: "0" }])}
        >
          + Thêm dòng
        </HButton>
        <div
          style={sx(
            "display:flex; align-items:center; gap:12px; margin-top:16px; padding-top:14px; border-top:1px solid #EDF1ED",
          )}
        >
          <div style={sx("flex:1; font-size:14px; color:#3C4A40")}>
            Tổng:{" "}
            <strong style={sx("color:#14261A")}>
              {money(
                items.reduce((s, it) => s + num(it.quantity) * num(it.price), 0),
                cur,
              )}
            </strong>
          </div>
          <HButton s={`${green} opacity:${busy ? ".6" : "1"}`} onClick={saveItems}>
            Lưu mặt hàng
          </HButton>
          <HButton s={ghost} onClick={() => setItems(null)}>
            Hủy
          </HButton>
        </div>
      </div>
    </div>
  );

  // ================= Modal: chọn báo giá có sẵn =================
  const pickerModal = picker && (
    <div style={sx(modalWrap)}>
      <div onClick={() => setPicker(false)} style={sx(overlay)} />
      <div
        style={sx(
          "position:relative; width:100%; max-width:520px; max-height:88vh; overflow:auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)",
        )}
      >
        <div style={sx("display:flex; align-items:center; gap:10px; margin-bottom:6px")}>
          <div style={sx("font-size:17px; font-weight:700; color:#14261A; flex:1")}>Chọn báo giá có sẵn</div>
          <HButton
            s="width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E"
            onClick={() => setPicker(false)}
          >
            ✕
          </HButton>
        </div>
        <div style={sx("font-size:12.5px; color:#8B9A90; margin-bottom:12px")}>
          Chọn bên dưới để dùng lại bảng giá đã có. Template này cần giá riêng thì tạo báo giá mới —
          báo giá đang gắn (nếu có) sẽ được thay, không bị xóa.
        </div>
        <HButton
          s={`${green} width:100%; height:42px; margin-bottom:14px`}
          onClick={() => {
            setPicker(false);
            openCreate();
          }}
        >
          + Tạo báo giá mới
        </HButton>
        <div style={sx("display:flex; flex-direction:column; gap:8px")}>
          {list.length === 0 && (
            <div style={sx("font-size:13px; color:#8B9A90; padding:6px 0")}>Chưa có báo giá nào trong hệ thống.</div>
          )}
          {list.map((q) => {
            const on = q.id === quotation?.id;
            return (
              <button
                key={q.id}
                onClick={() => !on && attach(q.id)}
                style={sx(
                  `display:flex; align-items:center; gap:10px; text-align:left; border-width:1px; border-style:solid; border-color:${on ? "#3EA85C" : "#E9EEE9"}; border-radius:11px; padding:11px 12px; background:${on ? "#F3FAF5" : "#fff"}; cursor:${on ? "default" : "pointer"}; width:100%`,
                )}
              >
                <span style={sx("font-size:18px")}>📄</span>
                <div style={sx("min-width:0; flex:1")}>
                  <div style={sx("font-size:13.5px; font-weight:600; color:#14261A")}>{q.code}</div>
                  <div style={sx("font-size:12px; color:#8B9A90")}>
                    {q.title || "—"} · {q._count.templates} template
                    {q.market ? ` · ${q.market}` : ""}
                  </div>
                </div>
                <span style={sx("font-size:12.5px; color:#4A5A4E; flex-shrink:0")}>{money(q.totalAmount, q.currency)}</span>
                <span
                  style={sx(
                    "font-size:12.5px; font-weight:600; color:#1F7440; background:#EAF3EC; border-radius:8px; padding:5px 11px; flex-shrink:0",
                  )}
                >
                  {on ? "Đang dùng" : "Gắn"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ================= Modal: xác nhận gỡ =================
  const detachModal = confirmDetach && (
    <div style={sx(modalWrap)}>
      <div onClick={() => setConfirmDetach(false)} style={sx(overlay)} />
      <div
        style={sx(
          "position:relative; width:100%; max-width:420px; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5)",
        )}
      >
        <div style={sx("font-size:17px; font-weight:700; color:#14261A; margin-bottom:8px")}>Gỡ báo giá khỏi template?</div>
        <div style={sx("font-size:13.5px; line-height:1.55; color:#4A5A4E; margin-bottom:18px")}>
          Báo giá <strong style={sx("color:#14261A")}>“{quotation?.code}”</strong> <strong>không bị xóa</strong> — chỉ
          tháo khỏi template này. Nhưng template sẽ <strong>biến mất khỏi màn Gửi báo giá</strong> cho tới khi gắn báo
          giá khác.
        </div>
        <div style={sx("display:flex; gap:10px")}>
          <HButton
            s="flex:1; height:44px; border:none; border-radius:11px; background:#B3261E; color:#fff; font-size:14px; font-weight:600; cursor:pointer"
            onClick={() => attach(null)}
          >
            Gỡ báo giá
          </HButton>
          <HButton s={`${ghost} height:44px`} onClick={() => setConfirmDetach(false)}>
            Hủy
          </HButton>
        </div>
      </div>
    </div>
  );

  // ================= Chưa gắn báo giá =================
  if (!quotation) {
    return (
      <div style={sx(card + "; margin-top:14px")}>
        <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px")}>
          <span style={sx("width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)")} />
          <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Báo giá</div>
        </div>
        <div
          style={sx(
            "background:#FDF6E7; border:1px solid #F3E3BE; border-radius:12px; padding:14px 16px; font-size:13.5px; color:#8A5B08; line-height:1.55",
          )}
        >
          Template này <b>chưa gắn báo giá</b> nên không xuất hiện ở màn <b>Gửi báo giá</b>. Gắn một bảng giá để gửi được.
        </div>
        <div style={sx("display:flex; gap:10px; margin-top:14px; flex-wrap:wrap")}>
          <HButton s={green} onClick={openCreate}>
            + Tạo báo giá
          </HButton>
          <HButton s={ghost} onClick={openPicker}>
            Chọn báo giá có sẵn
          </HButton>
        </div>
        {formModal}
        {pickerModal}
      </div>
    );
  }

  // ================= Đã gắn báo giá =================
  return (
    <div style={sx(card + "; margin-top:14px")}>
      <div style={sx("display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap")}>
        <span style={sx("width:4px; height:16px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440)")} />
        <div style={sx("font-size:15px; font-weight:700; color:#14261A; flex:1")}>Báo giá</div>
        <HButton s={ghost} onClick={openEdit}>
          Sửa thông tin
        </HButton>
        <HButton s={ghost} onClick={openPicker}>
          Đổi / tạo báo giá
        </HButton>
        <HButton
          s="width:34px; height:34px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; cursor:pointer; flex-shrink:0"
          title="Gỡ báo giá khỏi template"
          onClick={() => setConfirmDetach(true)}
        >
          ×
        </HButton>
      </div>

      <div style={sx("display:flex; align-items:baseline; gap:10px; flex-wrap:wrap")}>
        <div style={sx("font-size:18px; font-weight:700; color:#14261A")}>{quotation.code}</div>
        <div style={sx("font-size:13px; color:#7B8A80")}>{quotation.title || "—"}</div>
      </div>

      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:10px; margin-top:12px")}>
        <Info label="Tổng giá trị" value={money(quotation.totalAmount, cur)} sub={`${quotation.items.length} mặt hàng`} />
        <Info label="Thị trường" value={quotation.market || "—"} />
        <Info label="Hiệu lực đến" value={fmtDate(quotation.validUntil)} />
        <Info label="Ngày phát hành" value={fmtDate(quotation.issuedDate)} />
      </div>

      {shared && (
        <div
          style={sx(
            "margin-top:12px; font-size:12.5px; color:#B07208; background:#FDF6E7; border:1px solid #F3E3BE; border-radius:10px; padding:9px 12px; line-height:1.45",
          )}
        >
          Báo giá này đang gắn ở <b>{quotation._count.templates} template</b> — sửa mặt hàng/giá ở đây sẽ đổi cho tất cả.{" "}
          <span
            onClick={() => router.push(`/bao-gia/${quotation.id}`)}
            style={sx("color:#1F7440; font-weight:600; cursor:pointer; text-decoration:underline; text-underline-offset:2px")}
          >
            Xem template dùng chung
          </span>
        </div>
      )}

      <div style={sx("display:flex; align-items:center; gap:8px; margin-top:16px; margin-bottom:8px")}>
        <div style={sx("font-size:13.5px; font-weight:700; color:#3C4A40; flex:1")}>
          Mặt hàng ({quotation.items.length})
        </div>
        <HButton s={ghost} onClick={openItems}>
          Sửa mặt hàng
        </HButton>
      </div>

      {quotation.items.length === 0 ? (
        <div style={sx("font-size:13px; color:#8B9A90")}>
          Chưa có mặt hàng — tin nhắn sẽ gửi đi với bảng giá trống. Bấm “Sửa mặt hàng” để thêm.
        </div>
      ) : (
        <div style={sx("border:1px solid #EEF2EE; border-radius:12px; overflow:hidden")}>
          <div style={sx("display:flex; background:#EAF3EC; color:#1F7440; font-weight:600; font-size:12.5px; height:36px; align-items:center")}>
            <div style={sx(cell(0.5, "center"))}>#</div>
            <div style={sx(cell(3, "flex-start"))}>Mặt hàng</div>
            <div style={sx(cell(1.4, "flex-end"))}>SL</div>
            <div style={sx(cell(1.6, "flex-end"))}>Đơn giá</div>
            <div style={sx(cell(1.8, "flex-end"))}>Thành tiền</div>
          </div>
          {quotation.items.map((it, i) => (
            <div
              key={it.id}
              style={sx(
                `display:flex; font-size:12.5px; min-height:40px; align-items:center; background:${i % 2 ? "#F7FAF7" : "#fff"}; border-top:1px solid #F0F3F0`,
              )}
            >
              <div style={sx(cell(0.5, "center") + "; color:#8B9A90")}>{it.no || i + 1}</div>
              <div style={sx(cell(3, "flex-start") + "; flex-direction:column; align-items:flex-start; justify-content:center; padding-top:6px; padding-bottom:6px")}>
                <div style={sx("font-weight:600; color:#14261A")}>{it.product}</div>
                {it.packing && <div style={sx("font-size:11px; color:#8B9A90")}>{it.packing}</div>}
              </div>
              <div style={sx(cell(1.4, "flex-end") + "; color:#4A5A4E")}>
                {num(it.quantity).toLocaleString("vi-VN")} {it.unit || ""}
              </div>
              <div style={sx(cell(1.6, "flex-end") + "; color:#4A5A4E")}>{num(it.price).toLocaleString("vi-VN")}</div>
              <div style={sx(cell(1.8, "flex-end") + "; font-weight:600; color:#14261A")}>
                {(num(it.quantity) * num(it.price)).toLocaleString("vi-VN")}
              </div>
            </div>
          ))}
        </div>
      )}

      {formModal}
      {itemsModal}
      {pickerModal}
      {detachModal}
    </div>
  );
}
