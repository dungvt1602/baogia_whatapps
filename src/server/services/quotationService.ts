import "server-only";
import { prisma } from "@/server/db/prisma";
import { computeTotal } from "@/server/lib/placeholders";
import type { CreateQuotationInput, ItemInput } from "@/server/validation/quotation.schema";

export function listQuotations() {
  return prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { templates: true } } },
  });
}

export function createQuotation(input: CreateQuotationInput) {
  return prisma.quotation.create({
    data: {
      code: input.code,
      title: input.title ?? null,
      totalAmount: (input.totalAmount ?? 0).toString(),
      currency: input.currency ?? "VND",
      status: input.status ?? "DRAFT",
      market: input.market ?? null,
    },
  });
}

export function getQuotationWithItems(id: string) {
  return prisma.quotation.findUnique({
    where: { id: BigInt(id) },
    include: { items: { orderBy: { no: "asc" } } },
  });
}

// Chi tiết đầy đủ 1 báo giá: sản phẩm + template thuộc về nó.
export function getQuotationDetail(id: string) {
  return prisma.quotation.findUnique({
    where: { id: BigInt(id) },
    include: {
      items: { orderBy: { no: "asc" } },
      templates: {
        orderBy: { createdAt: "asc" },
        include: {
          channel: { select: { type: true } },
          _count: { select: { customerLinks: true } },
        },
      },
      _count: { select: { templates: true } },
    },
  });
}

// Xóa báo giá: dọn lệnh gửi/jobs, gỡ template về kho, xóa items + gán user, rồi xóa báo giá.
export async function deleteQuotation(id: string) {
  const qid = BigInt(id);
  const batches = await prisma.sendBatch.findMany({ where: { quotationId: qid }, select: { id: true } });
  const batchIds = batches.map((b) => b.id);
  await prisma.$transaction([
    ...(batchIds.length ? [prisma.sendJob.deleteMany({ where: { batchId: { in: batchIds } } })] : []),
    prisma.sendBatch.deleteMany({ where: { quotationId: qid } }),
    prisma.quotationTemplateSend.deleteMany({ where: { quotationId: qid } }),
    prisma.template.updateMany({ where: { quotationId: qid }, data: { quotationId: null } }),
    prisma.quotationItem.deleteMany({ where: { quotationId: qid } }),
    prisma.userQuotation.deleteMany({ where: { quotationId: qid } }),
    prisma.quotation.delete({ where: { id: qid } }),
  ]);
  return { ok: true };
}

export function listItems(quotationId: string) {
  return prisma.quotationItem.findMany({
    where: { quotationId: BigInt(quotationId) },
    orderBy: { no: "asc" },
  });
}

// Thay TOÀN BỘ mặt hàng + tự tính lại tổng tiền.
export async function setItems(quotationId: string, rawItems: ItemInput[]) {
  const qid = BigInt(quotationId);
  const items = rawItems
    .filter((it) => (it.product ?? "").trim())
    .map((it, i) => ({
      quotationId: qid,
      no: Number(it.no ?? i + 1),
      product: String(it.product ?? "").trim(),
      packing: it.packing ? String(it.packing) : null,
      unit: it.unit ? String(it.unit) : null,
      quantity: it.quantity != null ? String(it.quantity) : "1",
      price: it.price != null ? String(it.price) : "0",
      note: it.note ? String(it.note) : null,
    }));

  const total = computeTotal(items.map((it) => ({ quantity: it.quantity, price: it.price })));

  await prisma.$transaction([
    prisma.quotationItem.deleteMany({ where: { quotationId: qid } }),
    ...(items.length ? [prisma.quotationItem.createMany({ data: items })] : []),
    prisma.quotation.update({ where: { id: qid }, data: { totalAmount: total } }),
  ]);

  const saved = await prisma.quotationItem.findMany({ where: { quotationId: qid }, orderBy: { no: "asc" } });
  return { items: saved, totalAmount: total };
}
