import { prisma } from "@/lib/prisma";
import { jsonBig } from "@/lib/json";

// GET /api/quotations — danh sách báo giá (kèm số template)
export async function GET() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { templates: true } } },
  });
  return jsonBig(quotations);
}

// POST /api/quotations — tạo báo giá
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const q = await prisma.quotation.create({
      data: {
        code: b.code,
        title: b.title ?? null,
        totalAmount: b.totalAmount ?? 0,
        currency: b.currency ?? "VND",
        status: b.status ?? "DRAFT",
        market: b.market ?? null,
      },
    });
    return jsonBig(q, { status: 201 });
  } catch (err) {
    return jsonBig({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
