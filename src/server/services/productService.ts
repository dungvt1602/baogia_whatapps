import "server-only";
import { prisma } from "@/server/db/prisma";
import type { CreateProductInput, UpdateProductInput } from "@/server/validation/product.schema";

// GIA_FINAL = GIA_MUA × (1 + HAO_HUT/100) + VAN_CHUYEN. Hết hàng (giaMua rỗng) -> null.
function computeGiaFinal(giaMua: number | null, haoHut: number, vanChuyen: number): string | null {
  if (giaMua == null) return null;
  return (giaMua * (1 + haoHut / 100) + vanChuyen).toFixed(2);
}

// Chuyển "" / null / "HẾT HÀNG"... -> null; số hợp lệ -> number.
function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function listProducts() {
  return prisma.product.findMany({ orderBy: { code: "asc" } });
}

export function createProduct(input: CreateProductInput) {
  const giaMua = toNum(input.giaMua);
  const haoHut = toNum(input.haoHut) ?? 0;
  const vanChuyen = toNum(input.vanChuyen) ?? 0;
  return prisma.product.create({
    data: {
      code: input.code,
      name: input.name,
      unit: input.unit ?? null,
      giaMua: giaMua != null ? giaMua.toString() : null,
      haoHut: haoHut.toString(),
      vanChuyen: vanChuyen.toString(),
      giaFinal: computeGiaFinal(giaMua, haoHut, vanChuyen),
      currency: input.currency ?? "VND",
      status: input.status ?? "ACTIVE",
      note: input.note ?? null,
    },
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  // Đọc bản ghi hiện tại để tính lại GIA_FINAL khi 1 trong 3 yếu tố đổi.
  const cur = await prisma.product.findUnique({ where: { id: BigInt(id) } });
  if (!cur) throw new Error("Không tìm thấy sản phẩm.");

  const data: Record<string, unknown> = {};
  if (input.code !== undefined) data.code = input.code;
  if (input.name !== undefined) data.name = input.name;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.status !== undefined) data.status = input.status;
  if (input.note !== undefined) data.note = input.note;

  const giaMua = input.giaMua !== undefined ? toNum(input.giaMua) : (cur.giaMua != null ? Number(cur.giaMua) : null);
  const haoHut = input.haoHut !== undefined ? (toNum(input.haoHut) ?? 0) : Number(cur.haoHut);
  const vanChuyen = input.vanChuyen !== undefined ? (toNum(input.vanChuyen) ?? 0) : Number(cur.vanChuyen);

  if (input.giaMua !== undefined) data.giaMua = giaMua != null ? giaMua.toString() : null;
  if (input.haoHut !== undefined) data.haoHut = haoHut.toString();
  if (input.vanChuyen !== undefined) data.vanChuyen = vanChuyen.toString();
  // Tính lại GIA_FINAL nếu bất kỳ yếu tố nào đổi.
  if (input.giaMua !== undefined || input.haoHut !== undefined || input.vanChuyen !== undefined) {
    data.giaFinal = computeGiaFinal(giaMua, haoHut, vanChuyen);
  }
  return prisma.product.update({ where: { id: BigInt(id) }, data });
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id: BigInt(id) } });
  return { ok: true };
}
