import "server-only";

// Gửi 1 tin nhắn báo giá qua kênh. Trả { messageId } hoặc ném lỗi.
// - SEND_DRY_RUN != "false" (mặc định) -> giả lập thành công (để test luồng).
// - WhatsApp: gửi bằng TEMPLATE đã duyệt (kèm ảnh header) nếu có, ngược lại gửi text.

export type WaTemplate = {
  templateName: string;
  language: string;
  mediaId?: string;
  includeImage: boolean;
};

export type SendInput = {
  channelType: string; // WHATSAPP | ZALO | TELEGRAM
  apiKeyEnv?: string | null;
  accountId?: string | null;
  toPhone?: string | null;
  toName?: string | null;
  text: string; // nội dung text (khi không dùng WhatsApp template)
  wa?: WaTemplate | null;
};

function isDryRun(): boolean {
  return process.env.SEND_DRY_RUN !== "false";
}
function dryId(): string {
  return "DRYRUN-" + crypto.randomUUID();
}
function apiVersion(): string {
  return process.env.WHATSAPP_API_VERSION || "v20.0";
}

// Upload ảnh lên WhatsApp -> trả media id (giống bot.uploadImageMedia).
export async function uploadWhatsAppMedia(opts: {
  token: string;
  phoneNumberId: string;
  bytes: ArrayBuffer;
  mime?: string;
  filename?: string;
}): Promise<string> {
  const mime = opts.mime || "image/png";
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mime);
  form.append("file", new Blob([opts.bytes], { type: mime }), opts.filename || "quotation");

  const res = await fetch(`https://graph.facebook.com/${apiVersion()}/${opts.phoneNumberId}/media`, {
    method: "POST",
    headers: { authorization: `Bearer ${opts.token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) throw new Error("WhatsApp upload media lỗi: " + JSON.stringify(data));
  return data.id as string;
}

async function sendWhatsAppTemplate(opts: {
  token: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  language: string;
  mediaId?: string;
  includeImage: boolean;
  customerName: string;
}): Promise<{ messageId: string }> {
  const components: unknown[] = [];
  if (opts.includeImage && opts.mediaId) {
    components.push({ type: "header", parameters: [{ type: "image", image: { id: opts.mediaId } }] });
  }
  if (opts.customerName) {
    components.push({ type: "body", parameters: [{ type: "text", text: opts.customerName }] });
  }
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.language },
      ...(components.length ? { components } : {}),
    },
  };
  const res = await fetch(`https://graph.facebook.com/${apiVersion()}/${opts.phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${opts.token}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error("WhatsApp template lỗi: " + JSON.stringify(data?.error || data));
  return { messageId: data?.messages?.[0]?.id || "" };
}

export async function sendQuotationMessage(input: SendInput): Promise<{ messageId: string }> {
  if (isDryRun()) return { messageId: dryId() };

  const type = (input.channelType || "").toUpperCase();
  const token = input.apiKeyEnv ? process.env[input.apiKeyEnv] : undefined;

  if (type === "WHATSAPP") {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || input.accountId || "";
    if (!token || !phoneNumberId) {
      throw new Error("Thiếu WhatsApp token hoặc WHATSAPP_PHONE_NUMBER_ID.");
    }
    // Gửi bằng template đã duyệt (bắt buộc cho tin chủ động ngoài cửa sổ 24h)
    if (input.wa?.templateName) {
      return sendWhatsAppTemplate({
        token,
        phoneNumberId,
        to: input.toPhone!,
        templateName: input.wa.templateName,
        language: input.wa.language,
        mediaId: input.wa.mediaId,
        includeImage: input.wa.includeImage,
        customerName: input.toName || "",
      });
    }
    // Gửi text (chỉ hoạt động trong cửa sổ 24h)
    const res = await fetch(`https://graph.facebook.com/${apiVersion()}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: input.toPhone, type: "text", text: { body: input.text } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) throw new Error("WhatsApp lỗi: " + JSON.stringify(data?.error || data));
    return { messageId: data?.messages?.[0]?.id || "" };
  }

  if (type === "TELEGRAM") {
    const chatId = input.toPhone || input.accountId || "";
    if (!token || !chatId) throw new Error("Thiếu Telegram bot token hoặc chat id.");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: input.text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error("Telegram lỗi: " + JSON.stringify(data));
    return { messageId: String(data?.result?.message_id ?? "") };
  }

  throw new Error("Kênh chưa hỗ trợ gửi thật: " + type);
}
