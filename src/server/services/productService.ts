import "server-only";
import { prisma } from "@/server/db/prisma";
import type { CreateProductInput, UpdateProductInput } from "@/server/validation/product.schema";

export function listProducts() {
  return prisma.product.findMany({ orderBy: { name: "asc" } });
}

export function createProduct(input: CreateProductInput) {
  return prisma.product.create({
    data: {
      name: input.name,
      unit: input.unit ?? null,
      packing: input.packing ?? null,
      price: (input.price ?? 0).toString(),
      currency: input.currency ?? "VND",
      market: input.market ?? null,
      note: input.note ?? null,
    },
  });
}

export function updateProduct(id: string, input: UpdateProductInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.packing !== undefined) data.packing = input.packing;
  if (input.price !== undefined) data.price = (input.price ?? 0).toString();
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.market !== undefined) data.market = input.market;
  if (input.note !== undefined) data.note = input.note;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  return prisma.product.update({ where: { id: BigInt(id) }, data });
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id: BigInt(id) } });
  return { ok: true };
}
