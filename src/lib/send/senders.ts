import "server-only";

// Gửi 1 tin nhắn qua kênh. Trả { messageId } hoặc ném lỗi.
// - Có token thật (đọc từ env qua apiKeyEnv) -> gọi API thật.
// - Chưa cấu hình + SEND_DRY_RUN != "false" -> giả lập thành công (để test luồng).

export type SendInput = {
  channelType: string; // WHATSAPP | ZALO | TELEGRAM
  apiKeyEnv?: string | null; // tên biến env chứa token
  accountId?: string | null; // WhatsApp phone number id / OA id...
  toPhone?: string | null;
  toName?: string | null;
  message: string;
};

function isDryRun(): boolean {
  return process.env.SEND_DRY_RUN !== "false";
}

function dryId(): string {
  return "DRYRUN-" + crypto.randomUUID();
}

export async function sendViaChannel(input: SendInput): Promise<{ messageId: string }> {
  const type = (input.channelType || "").toUpperCase();
  const token = input.apiKeyEnv ? process.env[input.apiKeyEnv] : undefined;

  if (type === "WHATSAPP") {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || input.accountId || "";
    if (!token || !phoneNumberId) {
      if (isDryRun()) return { messageId: dryId() };
      throw new Error(
        "Thiếu WhatsApp token hoặc WHATSAPP_PHONE_NUMBER_ID (đặt trong .env, biến khớp api_key_env của kênh).",
      );
    }
    const apiVer = process.env.WHATSAPP_API_VERSION || "v20.0";
    const res = await fetch(`https://graph.facebook.com/${apiVer}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.toPhone,
        type: "text",
        text: { body: input.message },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`WhatsApp lỗi ${res.status}: ${JSON.stringify(data)}`);
    }
    const messageId = data?.messages?.[0]?.id || "";
    return { messageId };
  }

  if (type === "TELEGRAM") {
    // Telegram gửi theo chat_id, không theo số điện thoại -> coi accountId/toPhone là chat id.
    const chatId = input.toPhone || input.accountId || "";
    if (!token || !chatId) {
      if (isDryRun()) return { messageId: dryId() };
      throw new Error("Thiếu Telegram bot token hoặc chat id.");
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: input.message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(`Telegram lỗi: ${JSON.stringify(data)}`);
    return { messageId: String(data?.result?.message_id ?? "") };
  }

  // ZALO hoặc kênh khác: chưa tích hợp API thật -> dry-run hoặc báo lỗi.
  if (isDryRun()) return { messageId: dryId() };
  throw new Error("Kênh chưa hỗ trợ gửi thật: " + type);
}
