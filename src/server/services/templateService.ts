import "server-only";
import { prisma } from "@/server/db/prisma";
import type { CreateTemplateInput, UpdateTemplateInput } from "@/server/validation/template.schema";

export function listTemplates() {
  return prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      quotation: { select: { id: true, code: true, title: true } },
      channel: { select: { id: true, name: true, type: true } },
      _count: { select: { customers: true } },
    },
  });
}

export function getTemplateDetail(id: string) {
  return prisma.template.findUnique({
    where: { id: BigInt(id) },
    include: {
      quotation: {
        select: { id: true, code: true, title: true, market: true, currency: true, totalAmount: true, validUntil: true, issuedDate: true },
      },
      channel: { select: { id: true, name: true, type: true, accountId: true } },
      image: { select: { mime: true, updatedAt: true } }, // chỉ lấy metadata, KHÔNG lấy bytes
      _count: { select: { customers: true } },
    },
  });
}

// ---- Ảnh header của template (bytes lưu trong DB) ----
export function getTemplateImage(id: bigint | number | string) {
  return prisma.templateImage.findUnique({ where: { templateId: BigInt(id) } });
}
export async function setTemplateImage(id: string, data: ArrayBuffer, mime: string) {
  const templateId = BigInt(id);
  const bytes = new Uint8Array(data);
  await prisma.templateImage.upsert({
    where: { templateId },
    create: { templateId, data: bytes, mime },
    update: { data: bytes, mime },
  });
  return { ok: true };
}
export async function clearTemplateImage(id: string) {
  await prisma.templateImage.deleteMany({ where: { templateId: BigInt(id) } });
  return { ok: true };
}

export function listTemplatesByQuotation(quotationId: string) {
  return prisma.template.findMany({
    where: { quotationId: BigInt(quotationId) },
    orderBy: { createdAt: "asc" },
    include: {
      channel: { select: { id: true, name: true, type: true } },
      _count: { select: { customers: true } },
    },
  });
}

export function createTemplate(quotationId: string, input: CreateTemplateInput) {
  return prisma.template.create({
    data: {
      quotationId: BigInt(quotationId),
      name: input.name,
      icon: input.icon ?? null,
      body: input.body ?? input.content ?? null,
      channelId: input.channelId ? BigInt(input.channelId) : null,
      waTemplateName: input.waTemplateName ?? null,
      ...(input.waLanguage ? { waLanguage: input.waLanguage } : {}),
      ...(input.waCategory !== undefined ? { waCategory: input.waCategory ?? null } : {}),
      ...(input.waImage != null ? { waImage: input.waImage } : {}),
    },
  });
}

// Tạo template trong kho (chưa gắn báo giá) — dùng ở menu Template.
export function createStandaloneTemplate(input: CreateTemplateInput) {
  return prisma.template.create({
    data: {
      name: input.name,
      icon: input.icon ?? null,
      body: input.body ?? input.content ?? null,
      channelId: input.channelId ? BigInt(input.channelId) : null,
      waTemplateName: input.waTemplateName ?? null,
      ...(input.waLanguage ? { waLanguage: input.waLanguage } : {}),
      ...(input.waCategory !== undefined ? { waCategory: input.waCategory ?? null } : {}),
      ...(input.waImage != null ? { waImage: input.waImage } : {}),
    },
  });
}

// Template trong kho (chưa gắn báo giá nào) — ứng viên để gắn vào 1 báo giá.
export function listPoolTemplates() {
  return prisma.template.findMany({
    where: { quotationId: null },
    orderBy: { createdAt: "desc" },
    include: {
      channel: { select: { id: true, name: true, type: true } },
      _count: { select: { customers: true } },
    },
  });
}

export function listTemplateCustomers(templateId: string) {
  return prisma.customer.findMany({
    where: { templateId: BigInt(templateId) },
    orderBy: { createdAt: "asc" },
  });
}

export function updateTemplate(id: string, input: UpdateTemplateInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.body !== undefined || input.content !== undefined) data.body = input.body ?? input.content ?? null;
  if (input.channelId !== undefined) data.channelId = input.channelId ? BigInt(input.channelId) : null;
  if (input.waTemplateName !== undefined) data.waTemplateName = input.waTemplateName;
  if (input.waLanguage !== undefined) data.waLanguage = input.waLanguage;
  if (input.waCategory !== undefined) data.waCategory = input.waCategory ?? null;
  if (input.waImage !== undefined) data.waImage = input.waImage;
  if (input.quotationId !== undefined) data.quotationId = input.quotationId ? BigInt(input.quotationId) : null;
  return prisma.template.update({ where: { id: BigInt(id) }, data });
}

// Xóa template: đưa khách về kho, xóa lệnh gửi liên quan (cascade jobs) rồi xóa template.
export async function deleteTemplate(id: string) {
  const tid = BigInt(id);
  await prisma.$transaction([
    prisma.customer.updateMany({ where: { templateId: tid }, data: { templateId: null } }),
    prisma.quotationTemplateSend.deleteMany({ where: { templateId: tid } }),
    prisma.sendBatch.deleteMany({ where: { templateId: tid } }),
    prisma.template.delete({ where: { id: tid } }),
  ]);
  return { ok: true };
}
