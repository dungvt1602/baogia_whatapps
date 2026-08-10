import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { CreateCustomerInput, PatchCustomerInput } from "@/server/validation/customer.schema";

export type ListCustomersOptions = {
  excludeTemplate?: string | null; // trả ứng viên để thêm vào 1 template (khách trong kho HOẶC ở template khác)
  market?: string | null; // lọc theo quốc gia (thị trường)
  search?: string | null; // tìm theo tên / SĐT / email
};

// Dựng điều kiện WHERE dùng chung cho list thường & list phân trang.
function buildCustomerWhere(opts: ListCustomersOptions): Prisma.CustomerWhereInput {
  const { excludeTemplate, market, search } = opts;
  const and: Prisma.CustomerWhereInput[] = [];

  if (excludeTemplate) {
    and.push({ OR: [{ templateId: null }, { templateId: { not: BigInt(excludeTemplate) } }] });
  }
  if (market && market.trim()) {
    and.push({ market: { equals: market.trim(), mode: "insensitive" } });
  }
  const kw = search?.trim();
  if (kw) {
    and.push({
      OR: [
        { name: { contains: kw, mode: "insensitive" } },
        { phone: { contains: kw, mode: "insensitive" } },
        { whatsappPhone: { contains: kw, mode: "insensitive" } },
        { email: { contains: kw, mode: "insensitive" } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export function listCustomers(opts: ListCustomersOptions = {}) {
  return prisma.customer.findMany({
    where: buildCustomerWhere(opts),
    orderBy: { name: "asc" },
    include: { template: { select: { id: true, name: true } } },
  });
}

export type ListCustomersPagedOptions = ListCustomersOptions & { page?: number; limit?: number };

// Danh sách khách có PHÂN TRANG (cho trang quản lý khách của template — hợp khi có hàng nghìn khách).
export async function listCustomersPaged(opts: ListCustomersPagedOptions = {}) {
  const where = buildCustomerWhere(opts);
  const page = Math.max(1, Math.trunc(opts.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(opts.limit ?? 20)));
  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: { template: { select: { id: true, name: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);
  return { items, total, page, limit };
}

// Danh sách quốc gia (market) khác nhau — dùng cho dropdown lọc.
export async function listCustomerMarkets(): Promise<string[]> {
  const rows = await prisma.customer.findMany({
    where: { market: { not: null } },
    distinct: ["market"],
    select: { market: true },
    orderBy: { market: "asc" },
  });
  return rows.map((r) => r.market ?? "").filter((m) => m.trim() !== "");
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
