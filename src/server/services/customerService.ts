import "server-only";
import { prisma } from "@/server/db/prisma";
import type { CreateCustomerInput, PatchCustomerInput } from "@/server/validation/customer.schema";

// excludeTemplate: trả ứng viên để thêm vào 1 template (khách trong kho HOẶC ở template khác)
export function listCustomers(excludeTemplate?: string | null) {
  const where = excludeTemplate
    ? { OR: [{ templateId: null }, { templateId: { not: BigInt(excludeTemplate) } }] }
    : {};
  return prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    include: { template: { select: { id: true, name: true } } },
  });
}

export function createCustomer(input: CreateCustomerInput) {
  return prisma.customer.create({
    data: {
      templateId: input.templateId ? BigInt(input.templateId) : null,
      name: input.name,
      phone: input.phone ?? null,
      whatsappPhone: input.whatsappPhone ?? input.phone ?? null,
      email: input.email ?? null,
      market: input.market ?? null,
      status: input.status ?? "ACTIVE",
      receiveQuotation: input.receiveQuotation ?? true,
    },
  });
}

// PATCH: chuyển template (templateId số/null) hoặc sửa thông tin.
export function updateCustomer(id: string, input: PatchCustomerInput) {
  const data: Record<string, unknown> = {};
  if ("templateId" in input) data.templateId = input.templateId == null ? null : BigInt(input.templateId);
  if (input.name !== undefined) data.name = input.name;
  if (input.whatsappPhone !== undefined) data.whatsappPhone = input.whatsappPhone;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.market !== undefined) data.market = input.market;
  if (input.status !== undefined) data.status = input.status;
  if (input.receiveQuotation !== undefined) data.receiveQuotation = input.receiveQuotation;
  return prisma.customer.update({ where: { id: BigInt(id) }, data });
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id: BigInt(id) } });
  return { ok: true };
}
