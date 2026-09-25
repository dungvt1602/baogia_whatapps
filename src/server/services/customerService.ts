import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createCustomerSchema, type CreateCustomerInput, type PatchCustomerInput } from "@/server/validation/customer.schema";

export type ListCustomersOptions = {
  excludeTemplate?: string | null; // trả ứng viên CHƯA thuộc template này
  market?: string | null; // lọc theo quốc gia (thị trường)
  search?: string | null; // tìm theo tên / công ty / SĐT / email / quốc gia
  sort?: string | null; // cột sắp xếp (chỉ nhận các cột trong SORTABLE)
  dir?: string | null; // asc | desc
};

// Sắp xếp phía server (màn Khách hàng phân trang server). Cột có thể trống -> đẩy ô trống xuống cuối.
// Thêm id làm khoá phụ để thứ tự ổn định giữa các trang (không lặp/sót khách khi chuyển trang).
const SORTABLE = ["name", "company", "whatsappPhone", "phone", "email", "market", "status"] as const;
const NULLABLE_SORT = new Set(["company", "whatsappPhone", "phone", "email", "market"]);
function buildCustomerOrder(opts: ListCustomersOptions): Prisma.CustomerOrderByWithRelationInput[] {
  const key = (SORTABLE as readonly string[]).includes(opts.sort || "") ? (opts.sort as string) : "name";
  const dir: Prisma.SortOrder = opts.dir === "desc" ? "desc" : "asc";
  const primary = NULLABLE_SORT.has(key) ? { [key]: { sort: dir, nulls: "last" } } : { [key]: dir };
  return [primary as Prisma.CustomerOrderByWithRelationInput, { id: "asc" }];
}

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
        { company: { contains: kw, mode: "insensitive" } },
        { phone: { contains: kw, mode: "insensitive" } },
        { whatsappPhone: { contains: kw, mode: "insensitive" } },
        { email: { contains: kw, mode: "insensitive" } },
        { market: { contains: kw, mode: "insensitive" } },
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
    orderBy: buildCustomerOrder(opts),
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
      orderBy: buildCustomerOrder(opts),
      include: customerInclude,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);
  return { items: items.map(shapeCustomer), total, page, limit };
}

// CHỌN TẤT CẢ: chỉ trả id của mọi khách khớp bộ lọc (không phân trang) — nhẹ, để FE tick hết dù có 45 trang.
// Kèm templateId -> trả thêm id nào đang thuộc template đó (để đếm "thêm" / "gỡ" đúng khi chọn xuyên trang).
export async function listCustomerIds(opts: ListCustomersOptions & { templateId?: string | null }) {
  const where = buildCustomerWhere(opts);
  const rows = await prisma.customer.findMany({ where, select: { id: true }, orderBy: { name: "asc" } });
  const ids = rows.map((r) => String(r.id));
  let inTemplateIds: string[] = [];
  if (opts.templateId && ids.length) {
    const links = await prisma.templateCustomer.findMany({
      where: { templateId: BigInt(opts.templateId), customerId: { in: rows.map((r) => r.id) } },
      select: { customerId: true },
    });
    inTemplateIds = links.map((l) => String(l.customerId));
  }
  return { ids, total: ids.length, inTemplateIds };
}

// Xoá hàng loạt (nút "Xoá đã chọn" khi chọn tất cả) — 1 câu lệnh thay vì N request. Trả số dòng đã xoá + vài tên đầu.
export async function deleteCustomersBulk(ids: (string | number)[]) {
  const bigIds = ids.map((i) => BigInt(i));
  if (!bigIds.length) return { deleted: 0, sample: [] as string[] };
  const sample = await prisma.customer.findMany({ where: { id: { in: bigIds } }, select: { name: true }, take: 5, orderBy: { name: "asc" } });
  const r = await prisma.customer.deleteMany({ where: { id: { in: bigIds } } }); // cascade xoá link template
  return { deleted: r.count, sample: sample.map((s) => s.name) };
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
    const parsed = createCustomerSchema.safeParse(cleanImportRow(raw));
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

  // Chia lô: file lớn (vd 16k dòng) mà 1 câu lệnh thì vượt trần 65.535 tham số của Postgres.
  const CHUNK = 1000;
  const waList = [...seen];
  const existSet = new Set<string | null>();
  for (let i = 0; i < waList.length; i += CHUNK) {
    const existing = await prisma.customer.findMany({
      where: { whatsappPhone: { in: waList.slice(i, i + CHUNK) } },
      select: { whatsappPhone: true },
    });
    existing.forEach((e) => existSet.add(e.whatsappPhone));
  }
  // Bỏ khách đã tồn tại trong DB (theo whatsappPhone).
  const toCreate = valid.filter((v) => !existSet.has(v.whatsappPhone));
  const skippedDup = valid.length - toCreate.length;

  let created = 0;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const r = await prisma.customer.createMany({
      data: toCreate.slice(i, i + CHUNK).map((v) => ({
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
      skipDuplicates: true,
    });
    created += r.count;
  }
  return { created, skippedDup, invalid };
}

// Dọn 1 dòng nhập trước khi kiểm tra: ô PHỤ sai định dạng chỉ bỏ ô đó, không loại cả khách
// (vd email ghi 2 địa chỉ "a@x.kr b.com" -> lấy địa chỉ hợp lệ đầu tiên, không có thì để trống).
// Quốc gia viết HOA cho khớp dữ liệu sẵn có ("Japan" -> "JAPAN").
const IMPORT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function cleanImportRow(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = { ...(raw as Record<string, unknown>) };
  if (typeof r.email === "string" && r.email && !IMPORT_EMAIL_RE.test(r.email)) {
    r.email = r.email.split(/[\s;,]+/).find((p) => IMPORT_EMAIL_RE.test(p)) || "";
  }
  if (typeof r.phone === "string" && r.phone && !/^\d{6,15}$/.test(r.phone)) r.phone = "";
  if (typeof r.market === "string") r.market = r.market.trim().toUpperCase();
  return r;
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
