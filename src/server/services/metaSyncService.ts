import "server-only";
import { prisma } from "@/server/db/prisma";

// ĐỒNG BỘ ĐỊNH NGHĨA TEMPLATE TỪ META: server tự biết mẫu nào có nút FLOW hay URL,
// header có ảnh hay không -> set cờ waFlow/waImage đúng cho toàn bộ template trong DB,
// hết cảnh tích tay sai rồi dính #132018 / #131009.
//
// WABA ID tìm theo thứ tự: env WHATSAPP_WABA_ID -> API /me/assigned_whatsapp_business_accounts
// -> app_settings.waba_id (tự bắt từ webhook: mỗi event WhatsApp đều chứa entry.id = WABA).

const V = () => process.env.WHATSAPP_API_VERSION || "v22.0";

async function graphGet(path: string): Promise<Record<string, unknown>> {
  const token = process.env.WHATSAPP_TOKEN_MAIN;
  if (!token) throw new Error("Thiếu WHATSAPP_TOKEN_MAIN.");
  const res = await fetch(`https://graph.facebook.com/${V()}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Graph API lỗi ${res.status}: ` + JSON.stringify((data as { error?: unknown })?.error || data).slice(0, 300));
  return data;
}

// Lưu WABA id bắt được từ webhook (entry.id). Gọi fire-and-forget, không phá webhook.
let wabaCaptured = false; // đỡ ghi DB lặp trong cùng process
export async function captureWabaId(wabaId: string): Promise<void> {
  if (!wabaId || wabaCaptured) return;
  try {
    await prisma.appSetting.upsert({
      where: { key: "waba_id" },
      create: { key: "waba_id", value: wabaId },
      update: { value: wabaId },
    });
    wabaCaptured = true;
  } catch {
    // nuốt lỗi
  }
}

async function resolveWabaId(): Promise<string> {
  // 1) Env (chủ động khai)
  if (process.env.WHATSAPP_WABA_ID) return process.env.WHATSAPP_WABA_ID;
  // 2) API — chạy được khi System User đã được GÁN tài sản WABA trong Business Settings
  try {
    const d = await graphGet("/me/assigned_whatsapp_business_accounts");
    const first = (d.data as { id?: string }[] | undefined)?.[0]?.id;
    if (first) return first;
  } catch {
    // thử nguồn tiếp
  }
  // 3) Tự bắt từ webhook (entry.id) — có sau lần đầu khách nhắn/tin trạng thái về
  const row = await prisma.appSetting.findUnique({ where: { key: "waba_id" } });
  if (row?.value) return row.value;
  throw new Error(
    "Chưa tìm được WABA ID. Cách nhanh nhất: vào Business Settings -> System users -> AGO Quote WA -> " +
      "Add assets -> WhatsApp accounts -> gán tài khoản WhatsApp (full control). " +
      "Hoặc chờ 1 tin webhook về (khách nhắn) là hệ thống tự bắt được.",
  );
}

type MetaButton = { type?: string };
type MetaComponent = { type?: string; format?: string; buttons?: MetaButton[] };
type MetaTemplate = { name?: string; language?: string; status?: string; components?: MetaComponent[] };

// Tải TOÀN BỘ mẫu từ Meta (phân trang) -> map name -> {hasFlow, hasUrl, hasImageHeader, status}.
async function fetchMetaTemplates(wabaId: string): Promise<Map<string, { hasFlow: boolean; hasImageHeader: boolean; buttons: string[]; status: string; language: string }>> {
  const map = new Map<string, { hasFlow: boolean; hasImageHeader: boolean; buttons: string[]; status: string; language: string }>();
  let path: string | null = `/${wabaId}/message_templates?fields=name,language,status,components&limit=100`;
  while (path) {
    const d = await graphGet(path);
    for (const t of (d.data as MetaTemplate[] | undefined) || []) {
      const comps = t.components || [];
      const header = comps.find((c) => (c.type || "").toUpperCase() === "HEADER");
      const btns = comps.find((c) => (c.type || "").toUpperCase() === "BUTTONS")?.buttons || [];
      const types = btns.map((b) => (b.type || "").toUpperCase());
      // 1 tên mẫu có thể nhiều ngôn ngữ — ưu tiên bản APPROVED
      const existing = map.get(t.name || "");
      if (existing && existing.status === "APPROVED" && t.status !== "APPROVED") continue;
      map.set(t.name || "", {
        hasFlow: types.includes("FLOW"),
        hasImageHeader: (header?.format || "").toUpperCase() === "IMAGE",
        buttons: types,
        status: t.status || "",
        language: t.language || "",
      });
    }
    const next = (d.paging as { next?: string } | undefined)?.next;
    path = next ? next.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+/, "") : null;
  }
  return map;
}

// Tra 1 mẫu theo TÊN trên Meta (dùng lúc tạo/sửa template trong app).
// - null        = KHÔNG tra được (chưa có WABA / lỗi mạng) -> caller giữ giá trị hiện có
// - found:false = tra được nhưng Meta KHÔNG có mẫu tên này (gõ sai tên)
export async function getMetaTemplateDef(name: string): Promise<{ found: boolean; hasFlow: boolean; hasImageHeader: boolean; status: string } | null> {
  let wabaId: string;
  try {
    wabaId = await resolveWabaId();
  } catch {
    return null;
  }
  try {
    const d = await graphGet(`/${wabaId}/message_templates?name=${encodeURIComponent(name)}&fields=name,language,status,components&limit=20`);
    const exact = (((d.data as MetaTemplate[] | undefined) || [])).filter((t) => t.name === name);
    if (!exact.length) return { found: false, hasFlow: false, hasImageHeader: false, status: "" };
    const best = exact.find((t) => t.status === "APPROVED") || exact[0];
    const comps = best.components || [];
    const header = comps.find((c) => (c.type || "").toUpperCase() === "HEADER");
    const types = (comps.find((c) => (c.type || "").toUpperCase() === "BUTTONS")?.buttons || []).map((b) => (b.type || "").toUpperCase());
    return {
      found: true,
      hasFlow: types.includes("FLOW"),
      hasImageHeader: (header?.format || "").toUpperCase() === "IMAGE",
      status: best.status || "",
    };
  } catch {
    return null;
  }
}

// Đồng bộ: đối chiếu từng template trong app với định nghĩa Meta -> sửa cờ lệch.
export async function syncTemplatesFromMeta() {
  const wabaId = await resolveWabaId();
  const meta = await fetchMetaTemplates(wabaId);

  const templates = await prisma.template.findMany({
    where: { waTemplateName: { not: null } },
    select: { id: true, name: true, waTemplateName: true, waFlow: true, waImage: true },
  });

  const results: { template: string; metaName: string; buttons: string[]; changes: string[]; status: string }[] = [];
  let updated = 0;
  const notFound: string[] = [];

  for (const t of templates) {
    const m = meta.get(t.waTemplateName!);
    if (!m) {
      notFound.push(`${t.name} (${t.waTemplateName})`);
      continue;
    }
    const changes: string[] = [];
    const data: Record<string, boolean> = {};
    if (t.waFlow !== m.hasFlow) {
      data.waFlow = m.hasFlow;
      changes.push(`nút Flow: ${t.waFlow ? "BẬT" : "tắt"} -> ${m.hasFlow ? "BẬT" : "tắt"}`);
    }
    if (t.waImage !== m.hasImageHeader) {
      data.waImage = m.hasImageHeader;
      changes.push(`ảnh header: ${t.waImage ? "có" : "không"} -> ${m.hasImageHeader ? "có" : "không"}`);
    }
    if (Object.keys(data).length) {
      await prisma.template.update({ where: { id: t.id }, data });
      updated++;
    }
    results.push({ template: t.name, metaName: t.waTemplateName!, buttons: m.buttons, changes, status: m.status });
  }

  return { wabaId, totalMeta: meta.size, checked: templates.length, updated, notFound, results };
}
