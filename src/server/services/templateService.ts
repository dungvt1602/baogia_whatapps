import "server-only";
import { prisma } from "@/server/db/prisma";
import { createQuotation } from "@/server/services/quotationService";
import type { CreateTemplateInput, UpdateTemplateInput } from "@/server/validation/template.schema";

export function listTemplates() {
  return prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      quotation: { select: { id: true, code: true, title: true } },
      channel: { select: { id: true, name: true, type: true } },
      _count: { select: { customerLinks: true } },
    },
  });
}

// Danh sách template có phân trang + tìm kiếm (tên / tên template Meta / mã báo giá).
// Chịu được số lượng lớn (vd 1000 template) vì chỉ tải đúng 1 trang từ DB.
// Trả { items, total, page, limit }.
export async function listTemplatesPaged(params: {
  search?: string | null;
  page?: number;
  limit?: number;
}) {
  const kw = (params.search || "").trim();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 12));
  const where = kw
    ? {
        OR: [
          { name: { contains: kw, mode: "insensitive" as const } },
          { waTemplateName: { contains: kw, mode: "insensitive" as const } },
          { quotation: { code: { contains: kw, mode: "insensitive" as const } } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        quotation: { select: { id: true, code: true, title: true } },
        channel: { select: { id: true, name: true, type: true } },
        _count: { select: { customerLinks: true } },
      },
    }),
    prisma.template.count({ where }),
  ]);
  return { items, total, page, limit };
}

export function getTemplateDetail(id: string) {
  return prisma.template.findUnique({
    where: { id: BigInt(id) },
    include: {
      // Kèm mặt hàng + số template đang dùng chung: trang chi tiết template quản lý luôn báo giá.
      quotation: {
        select: {
          id: true, code: true, title: true, market: true, currency: true, totalAmount: true,
          status: true, validUntil: true, issuedDate: true,
          items: {
            orderBy: { no: "asc" },
            select: { id: true, no: true, product: true, packing: true, unit: true, quantity: true, price: true },
          },
          _count: { select: { templates: true } },
        },
      },
      channel: { select: { id: true, name: true, type: true, accountId: true } },
      image: { select: { mime: true, updatedAt: true } }, // chỉ lấy metadata, KHÔNG lấy bytes
      _count: { select: { customerLinks: true } },
    },
  });
}

// ---- Ảnh header của template (bytes lưu trong DB) ----
export function getTemplateImage(id: bigint | number | string) {
  return prisma.templateImage.findUnique({ where: { templateId: BigInt(id) } });
}
// Chỉ kiểm tra CÓ ảnh hay không (không kéo bytes) — ảnh ~2MB, kéo mỗi vòng worker
// từng làm cháy 11.6GB egress Supabase/ngày. Bytes chỉ tải đúng lúc cần upload.
export async function hasTemplateImage(id: bigint | number | string): Promise<boolean> {
  const row = await prisma.templateImage.findUnique({
    where: { templateId: BigInt(id) },
    select: { mime: true },
  });
  return !!row;
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
      _count: { select: { customerLinks: true } },
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
      waBodyParams: input.waBodyParams || null,
      ...(input.sendAsText != null ? { sendAsText: input.sendAsText } : {}),
      ...(input.waLanguage ? { waLanguage: input.waLanguage } : {}),
      ...(input.waCategory !== undefined ? { waCategory: input.waCategory ?? null } : {}),
      ...(input.waImage != null ? { waImage: input.waImage } : {}),
      ...(input.waFlow != null ? { waFlow: input.waFlow } : {}),
    },
  });
}

// Tạo template — TỰ gắn kèm 1 báo giá mặc định (rỗng) để gửi được ngay, không phải
// vào chi tiết template gắn báo giá thủ công. Mỗi template có bảng giá riêng; sửa
// mặt hàng/giá của báo giá này trong trang chi tiết template.
export async function createStandaloneTemplate(input: CreateTemplateInput) {
  const quotation = await createQuotation({
    title: input.name ? `Báo giá ${input.name}` : null,
  });
  return prisma.template.create({
    data: {
      quotationId: quotation.id,
      name: input.name,
      subject: input.subject ?? null, // tên sản phẩm
      icon: input.icon ?? null,
      body: input.body ?? input.content ?? null,
      channelId: input.channelId ? BigInt(input.channelId) : null,
      waTemplateName: input.waTemplateName ?? null,
      waBodyParams: input.waBodyParams || null,
      ...(input.sendAsText != null ? { sendAsText: input.sendAsText } : {}),
      ...(input.waLanguage ? { waLanguage: input.waLanguage } : {}),
      ...(input.waCategory !== undefined ? { waCategory: input.waCategory ?? null } : {}),
      ...(input.waImage != null ? { waImage: input.waImage } : {}),
      ...(input.waFlow != null ? { waFlow: input.waFlow } : {}),
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
      _count: { select: { customerLinks: true } },
    },
  });
}

export async function listTemplateCustomers(templateId: string) {
  const links = await prisma.templateCustomer.findMany({
    where: { templateId: BigInt(templateId) },
    orderBy: { createdAt: "asc" },
    include: { customer: true },
  });
  return links.map((l) => l.customer);
}

export function updateTemplate(id: string, input: UpdateTemplateInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.subject !== undefined) data.subject = input.subject ?? null; // tên sản phẩm
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.body !== undefined || input.content !== undefined) data.body = input.body ?? input.content ?? null;
  if (input.channelId !== undefined) data.channelId = input.channelId ? BigInt(input.channelId) : null;
  if (input.waTemplateName !== undefined) data.waTemplateName = input.waTemplateName;
  if (input.waLanguage !== undefined) data.waLanguage = input.waLanguage;
  if (input.waCategory !== undefined) data.waCategory = input.waCategory ?? null;
  if (input.waImage !== undefined) data.waImage = input.waImage;
  if (input.waBodyParams !== undefined) data.waBodyParams = input.waBodyParams || null;
  if (input.sendAsText !== undefined) data.sendAsText = input.sendAsText;
  if (input.waFlow !== undefined) data.waFlow = input.waFlow;
  if (input.quotationId !== undefined) data.quotationId = input.quotationId ? BigInt(input.quotationId) : null;
  return prisma.template.update({ where: { id: BigInt(id) }, data });
}

// Xóa template: xóa lệnh gửi liên quan rồi xóa template.
// Link N-N (template_customers) tự bị xoá theo (onDelete: Cascade) — khách hàng giữ nguyên.
export async function deleteTemplate(id: string) {
  const tid = BigInt(id);
  await prisma.$transaction([
    prisma.quotationTemplateSend.deleteMany({ where: { templateId: tid } }),
    prisma.sendBatch.deleteMany({ where: { templateId: tid } }),
    prisma.template.delete({ where: { id: tid } }),
  ]);
  return { ok: true };
}
