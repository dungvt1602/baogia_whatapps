import "server-only";
import { prisma } from "@/server/db/prisma";
import { renderTemplate, renderBodyParams } from "@/server/lib/placeholders";
import { sendQuotationMessage, uploadWhatsAppMedia } from "@/server/lib/whatsapp";
import { getTemplateImage } from "@/server/services/templateService";
import { logActivity } from "@/server/services/activityService";

const MAX_RETRY = 3;
const QUEUE_DELAY_MS = 1000; // delay giữa các tin (như bot)

// ---- Truy vấn lệnh gửi (cho controller batches) ----
export function listBatches() {
  return prisma.sendBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      quotation: { select: { code: true, title: true } },
      template: { select: { name: true } },
      channel: { select: { name: true, type: true } },
      _count: { select: { jobs: true } },
    },
  });
}

export function getBatch(id: string) {
  return prisma.sendBatch.findUnique({
    where: { id: BigInt(id) },
    include: {
      quotation: { select: { code: true, title: true } },
      template: { select: { name: true } },
      channel: { select: { name: true, type: true } },
      jobs: { orderBy: { id: "asc" } },
    },
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function compactDateTime(d: Date): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const o: Record<string, string> = {};
  p.forEach((x) => (o[x.type] = x.value));
  return `${o.year}${o.month}${o.day}${o.hour}${o.minute}${o.second}`;
}

// Lọc khách đủ điều kiện nhận (mirror bot: STATUS=ACTIVE + RECEIVE_QUOTATION=YES).
function eligible<T extends { status: string; receiveQuotation: boolean }>(customers: T[]): T[] {
  return customers.filter(
    (c) => (c.status || "").toUpperCase() === "ACTIVE" && c.receiveQuotation,
  );
}

// ---- 1) PREVIEW: tạo lệnh gửi, xem trước nội dung + danh sách khách ----
export async function previewSend(params: {
  templateId: bigint | number | string;
  channelId?: bigint | number | string | null;
  actor?: { id?: bigint | number | string | null; name?: string | null };
}) {
  const template = await prisma.template.findUnique({
    where: { id: BigInt(params.templateId) },
    include: {
      quotation: { include: { items: { orderBy: { no: "asc" } } } },
      channel: true,
      customerLinks: { include: { customer: true } },
    },
  });
  if (!template) throw new Error("Không tìm thấy template.");
  if (!template.quotation) throw new Error("Template này chưa gắn báo giá nên chưa gửi được. Mở chi tiết template để gắn báo giá.");

  const recipients = eligible(template.customerLinks.map((l) => l.customer));
  if (recipients.length === 0) {
    throw new Error("Template này chưa có khách hàng đủ điều kiện nhận. Khách cần đang hoạt động và bật nhận báo giá.");
  }

  // Kênh: ưu tiên channelId truyền vào, sau đó kênh mặc định của template.
  const channelId = params.channelId ? BigInt(params.channelId) : template.channelId;
  const channel = channelId
    ? await prisma.channel.findUnique({ where: { id: channelId } })
    : null;

  const code = "BG" + compactDateTime(new Date());
  const batch = await prisma.sendBatch.create({
    data: {
      code,
      quotationId: template.quotationId!,
      templateId: template.id,
      channelId: channel?.id ?? null,
      createdBy: params.actor?.id != null ? BigInt(params.actor.id) : null,
      recipientCount: recipients.length,
      status: "PREVIEW",
      note: "Đã tạo lệnh preview",
    },
  });

  const sample = renderTemplate(template.body || "", template.quotation, recipients[0], template.quotation.items);

  await logActivity({
    userId: params.actor?.id ?? null,
    actorName: params.actor?.name ?? null,
    action: "TAO_LENH_BAO_GIA",
    target: batch.code,
    result: "SUCCESS",
    note: `${recipients.length} khách · template ${template.name}`,
  });

  const q = template.quotation;
  return {
    batch,
    channel,
    template: { id: template.id, name: template.name, body: template.body, productName: template.subject, createdAt: template.createdAt },
    quotation: {
      code: q.code,
      title: q.title,
      market: q.market,
      currency: q.currency,
      totalAmount: q.totalAmount,
      validUntil: q.validUntil,
    },
    items: q.items.map((it) => ({
      no: it.no,
      product: it.product,
      packing: it.packing,
      unit: it.unit,
      quantity: it.quantity,
      price: it.price,
    })),
    sample,
    recipients: recipients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.whatsappPhone || c.phone || "",
    })),
  };
}

// ---- 2) CONFIRM: đẩy từng khách vào hàng đợi ----
export async function confirmSend(params: {
  batchId: bigint | number | string;
  actor?: { id?: bigint | number | string | null; name?: string | null };
}) {
  const batch = await prisma.sendBatch.findUnique({
    where: { id: BigInt(params.batchId) },
    include: {
      channel: true,
      template: {
        include: {
          quotation: { include: { items: { orderBy: { no: "asc" } } } },
          channel: true,
          customerLinks: { include: { customer: true } },
        },
      },
    },
  });
  if (!batch) throw new Error("Không tìm thấy lệnh gửi.");
  if (["QUEUED", "SENDING", "SENT"].includes(batch.status)) {
    throw new Error(`Lệnh ${batch.code} đã ở hàng đợi hoặc đã gửi.`);
  }
  if (!batch.template.quotation) throw new Error("Template này chưa gắn báo giá nên chưa gửi được.");

  const recipients = eligible(batch.template.customerLinks.map((l) => l.customer));
  if (recipients.length === 0) throw new Error("Template này chưa có khách hàng đủ điều kiện nhận.");

  const channel = batch.channel || batch.template.channel;
  const channelType = (channel?.type || "WHATSAPP").toUpperCase();

  await prisma.sendJob.createMany({
    data: recipients.map((c) => ({
      batchId: batch.id,
      customerId: c.id,
      toName: c.name,
      toPhone: c.whatsappPhone || c.phone || "",
      channel: channelType,
      message: renderTemplate(batch.template.body || "", batch.template.quotation!, c, batch.template.quotation!.items),
      status: "QUEUED",
    })),
  });

  await prisma.sendBatch.update({
    where: { id: batch.id },
    data: { status: "QUEUED", note: `Đã đưa ${recipients.length} khách vào hàng đợi` },
  });

  await logActivity({
    userId: params.actor?.id ?? null,
    actorName: params.actor?.name ?? null,
    action: "XAC_NHAN_GUI",
    target: batch.code,
    result: "SUCCESS",
    note: `Queue ${recipients.length} khách qua ${channelType}`,
  });

  return { batchId: batch.id, code: batch.code, queued: recipients.length };
}

// ---- 3) CANCEL ----
export async function cancelSend(params: { batchId: bigint | number | string }) {
  const batch = await prisma.sendBatch.update({
    where: { id: BigInt(params.batchId) },
    data: { status: "CANCELLED", note: "Người dùng đã hủy lệnh." },
  });
  await logActivity({ action: "HUY_LENH", target: batch.code, result: "SUCCESS" });
  return { batchId: batch.id, code: batch.code };
}

// ---- 4) WORKER: xử lý batch tiếp theo trong hàng đợi ----
export async function processNextBatch() {
  const nextJob = await prisma.sendJob.findFirst({
    where: {
      OR: [{ status: "QUEUED" }, { status: "FAILED", retryCount: { lt: MAX_RETRY } }],
    },
    orderBy: { id: "asc" },
  });
  if (!nextJob) return { processed: false as const };

  const batch = await prisma.sendBatch.findUnique({
    where: { id: nextJob.batchId },
    include: {
      channel: true,
      template: {
        include: { channel: true, quotation: { include: { items: { orderBy: { no: "asc" } } } } },
      },
    },
  });
  if (!batch) return { processed: false as const };

  await prisma.sendBatch.update({ where: { id: batch.id }, data: { status: "SENDING" } });

  const channel = batch.channel || batch.template.channel;
  const tpl = batch.template;
  const dryRun = process.env.SEND_DRY_RUN !== "false";

  // Ảnh header = ảnh do người dùng upload vào template (giống bot). Có ảnh thì gửi kèm.
  const tplImage = await getTemplateImage(tpl.id);
  // sendAsText bật -> ép đi đường text thường (như commit cũ), bỏ qua template Meta.
  const useWaTemplate =
    (channel?.type || "").toUpperCase() === "WHATSAPP" && !!tpl.waTemplateName && !tpl.sendAsText;
  const includeImage = !!tplImage;
  let mediaId = batch.mediaId || "";

  // Upload ảnh upload của template lên WhatsApp 1 lần/lệnh (chỉ khi gửi thật + có ảnh).
  if (useWaTemplate && includeImage && !mediaId && !dryRun && tplImage) {
    try {
      const token = process.env[channel?.apiKeyEnv || "WHATSAPP_TOKEN_MAIN"];
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || channel?.accountId || "";
      if (token && phoneNumberId) {
        const bytes = new Uint8Array(tplImage.data).buffer;
        mediaId = await uploadWhatsAppMedia({ token, phoneNumberId, bytes, mime: tplImage.mime, filename: `${batch.code}` });
        await prisma.sendBatch.update({ where: { id: batch.id }, data: { mediaId } });
      }
    } catch (err) {
      console.error("[sendWorker] upload ảnh lỗi:", err);
    }
  }

  const jobs = await prisma.sendJob.findMany({
    where: {
      batchId: batch.id,
      OR: [{ status: "QUEUED" }, { status: "FAILED", retryCount: { lt: MAX_RETRY } }],
    },
    orderBy: { id: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    await delay(QUEUE_DELAY_MS);
    await prisma.sendJob.update({ where: { id: job.id }, data: { status: "SENDING" } });

    if (!job.toPhone) {
      failed++;
      await prisma.sendJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: "Thiếu số điện thoại.", retryCount: job.retryCount + 1 },
      });
      continue;
    }

    try {
      const r = await sendQuotationMessage({
        channelType: job.channel,
        apiKeyEnv: channel?.apiKeyEnv,
        accountId: channel?.accountId,
        toPhone: job.toPhone,
        toName: job.toName,
        text: job.message || "",
        wa: useWaTemplate
          ? {
              templateName: tpl.waTemplateName!,
              language: tpl.waLanguage,
              mediaId,
              includeImage,
              bodyParams: tpl.quotation
                ? renderBodyParams(tpl.waBodyParams, tpl.quotation, { name: job.toName || "" }, tpl.quotation.items)
                : job.toName
                  ? [{ value: job.toName }]
                  : [],
              hasFlowButton: tpl.waFlow,
            }
          : null,
      });
      sent++;
      await prisma.sendJob.update({
        where: { id: job.id },
        data: { status: "SENT", messageId: r.messageId, error: null, sentAt: new Date() },
      });
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      const rc = job.retryCount + 1;
      // Lỗi VĨNH VIỄN của Meta (retry cũng vô ích) -> FAILED luôn, khỏi quay vòng hàng đợi:
      // 131049 chặn tin marketing, 131026 không giao được, 132xxx lỗi template, (#100) sai tham số...
      const permanent = /131049|131026|131047|131000|132\d{3}|\(#100\)|Parameter name is missing/.test(msg);
      await prisma.sendJob.update({
        where: { id: job.id },
        data: {
          status: permanent || rc >= MAX_RETRY ? "FAILED" : "QUEUED",
          error: msg,
          retryCount: rc,
        },
      });
    }
  }

  // Tính trạng thái cuối của batch.
  const remaining = await prisma.sendJob.count({
    where: { batchId: batch.id, status: { in: ["QUEUED", "SENDING"] } },
  });
  const failedCount = await prisma.sendJob.count({
    where: { batchId: batch.id, status: "FAILED" },
  });
  const finalStatus = remaining > 0 ? "QUEUED" : failedCount > 0 ? "PARTIAL_FAILED" : "SENT";

  await prisma.sendBatch.update({
    where: { id: batch.id },
    data: { status: finalStatus, note: `Đã gửi ${sent}, lỗi ${failed}` },
  });

  await logActivity({
    action: "GUI_WHATSAPP_QUEUE",
    target: batch.code,
    result: failed > 0 ? "FAILED" : "SUCCESS",
    note: `sent ${sent}, failed ${failed}, status ${finalStatus}`,
  });

  return { processed: true as const, code: batch.code, sent, failed, finalStatus };
}
