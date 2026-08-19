import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createCustomerSchema, type CreateCustomerInput, type PatchCustomerInput } from "@/server/validation/customer.schema";

export type ListCustomersOptions = {
  excludeTemplate?: string | null; // trả ứng viên CHƯA thuộc template này
  market?: string | null; // lọc theo quốc gia (thị trường)
  search?: string | null; // tìm theo tên / SĐT / email
};

// Dựng điều kiện WHERE dùng chung cho list thường & list phân trang.
function buildCustomerWhere(opts: ListCustomersOptions): Prisma.CustomerWhereInput {
  const { excludeTemplate, market, search } = opts;
  const and: Prisma.CustomerWhereInput[] = [];

  if (excludeTemplate) {
    // N-N: ứng viên = khách CHƯA có link tới template này.
    and.push({ NOT: { templateLinks: { some: { templateId: BigInt(excludeTemplate) } } } });
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

const customerInclude = {
  templateLinks: { include: { template: { select: { id: true, name: true } } } },
} satisfies Prisma.CustomerInclude;

type CustomerWithLinks = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

// Đổi templateLinks -> mảng `templates` cho gọn phía FE.
function shapeCustomer(c: CustomerWithLinks) {
  const { templateLinks, ...rest } = c;
  return { ...rest, templates: templateLinks.map((l) => l.template) };
}

export async function listCustomers(opts: ListCustomersOptions = {}) {
  const rows = await prisma.customer.findMany({
    where: buildCustomerWhere(opts),
    orderBy: { name: "asc" },
    include: customerInclude,
  });
  return rows.map(shapeCustomer);
}

export type ListCustomersPagedOptions = ListCustomersOptions & { page?: number; limit?: number };

// Danh sách khách có PHÂN TRANG (cho trang quản lý khách của template).
export async function listCustomersPaged(opts: ListCustomersPagedOptions = {}) {
  const where = buildCustomerWhere(opts);
  const page = Math.max(1, Math.trunc(opts.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(opts.limit ?? 20)));
  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: customerInclude,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);
  return { items: items.map(shapeCustomer), total, page, limit };
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
  const templateId = input.templateId;
  return prisma.customer.create({
    data: {
      name: input.name,
      company: input.company ?? null,
      phone: input.phone ?? null,
      whatsappPhone: input.whatsappPhone ?? input.phone ?? null,
      email: input.email ?? null,
      market: input.market ?? null,
      status: input.status ?? "ACTIVE",
      receiveQuotation: input.receiveQuotation ?? true,
      note: input.note ?? null,
      // Nếu có templateId -> tạo luôn link N-N.
      ...(templateId ? { templateLinks: { create: { templateId: BigInt(templateId) } } } : {}),
    },
  });
}

// Nhập hàng loạt khách hàng từ file (Excel/CSV đã parse ở client thành mảng object).
// - Validate từng dòng bằng createCustomerSchema (tên + WhatsApp bắt buộc).
// - Bỏ dòng trùng WhatsApp trong file, và trùng với khách đã có trong DB.
// - Tạo 1 phát bằng createMany. Trả về số tạo / số bỏ trùng / danh sách lỗi.
export async function importCustomers(rows: unknown[]): Promise<{
  created: number;
  skippedDup: number;
  invalid: { row: number; reason: string }[];
}> {
  const invalid: { row: number; reason: string }[] = [];
  const valid: CreateCustomerInput[] = [];
  const seen = new Set<string>();

  rows.forEach((raw, i) => {
    const parsed = createCustomerSchema.safeParse(raw);
    if (!parsed.success) {
      invalid.push({ row: i + 2, reason: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }); // +2: bỏ dòng tiêu đề
      return;
    }
    const wa = parsed.data.whatsappPhone;
    if (seen.has(wa)) {
      invalid.push({ row: i + 2, reason: `Trùng WhatsApp ${wa} trong file` });
      return;
    }
    seen.add(wa);
    valid.push(parsed.data);
  });

  // Bỏ khách đã tồn tại trong DB (theo whatsappPhone).
  const existing = seen.size
    ? await prisma.customer.findMany({ where: { whatsappPhone: { in: [...seen] } }, select: { whatsappPhone: true } })
    : [];
  const existSet = new Set(existing.map((e) => e.whatsappPhone));
  const toCreate = valid.filter((v) => !existSet.has(v.whatsappPhone));
  const skippedDup = valid.length - toCreate.length;

  let created = 0;
  if (toCreate.length) {
    const r = await prisma.customer.createMany({
      data: toCreate.map((v) => ({
        name: v.name,
        company: v.company ?? null,
        phone: v.phone ?? null,
        whatsappPhone: v.whatsappPhone ?? v.phone ?? null,
        email: v.email ?? null,
        market: v.market ?? null,
        status: v.status ?? "ACTIVE",
        receiveQuotation: v.receiveQuotation ?? true,
        note: v.note ?? null,
      })),
    });
    created = r.count;
  }
  return { created, skippedDup, invalid };
}

// PATCH: chỉ sửa thông tin khách (gán/gỡ template chuyển sang API link riêng).
export function updateCustomer(id: string, input: PatchCustomerInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.company !== undefined) data.company = input.company;
  if (input.whatsappPhone !== undefined) data.whatsappPhone = input.whatsappPhone;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.market !== undefined) data.market = input.market;
  if (input.status !== undefined) data.status = input.status;
  if (input.receiveQuotation !== undefined) data.receiveQuotation = input.receiveQuotation;
  if (input.note !== undefined) data.note = input.note;
  return prisma.customer.update({ where: { id: BigInt(id) }, data });
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id: BigInt(id) } }); // cascade xoá link
  return { ok: true };
}

// ---- Quản lý liên kết N-N template <-> customer ----
export async function addCustomerToTemplate(templateId: string, customerId: string) {
  const key = { templateId: BigInt(templateId), customerId: BigInt(customerId) };
  await prisma.templateCustomer.upsert({
    where: { templateId_customerId: key },
    create: key,
    update: {},
  });
  return { ok: true };
}

export async function removeCustomerFromTemplate(templateId: string, customerId: string) {
  await prisma.templateCustomer.deleteMany({
    where: { templateId: BigInt(templateId), customerId: BigInt(customerId) },
  });
  return { ok: true };
}
