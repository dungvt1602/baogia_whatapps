import "server-only";
import { prisma } from "@/server/db/prisma";
import type { CreateTemplateInput } from "@/server/validation/template.schema";

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
      _count: { select: { customers: true } },
    },
  });
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
      ...(input.waImage != null ? { waImage: input.waImage } : {}),
    },
  });
}

export function listTemplateCustomers(templateId: string) {
  return prisma.customer.findMany({
    where: { templateId: BigInt(templateId) },
    orderBy: { createdAt: "asc" },
  });
}
