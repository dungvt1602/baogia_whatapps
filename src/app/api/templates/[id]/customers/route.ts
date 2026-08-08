import { prisma } from "@/lib/prisma";
import { jsonBig } from "@/lib/json";

// GET /api/templates/[id]/customers — khách hàng của 1 template
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customers = await prisma.customer.findMany({
    where: { templateId: BigInt(id) },
    orderBy: { createdAt: "asc" },
  });
  return jsonBig(customers);
}

// POST /api/templates/[id]/customers — thêm khách vào template
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await request.json();
    const c = await prisma.customer.create({
      data: {
        templateId: BigInt(id),
        name: b.name,
        phone: b.phone ?? null,
        whatsappPhone: b.whatsappPhone ?? b.phone ?? null,
        email: b.email ?? null,
        market: b.market ?? null,
        status: b.status ?? "ACTIVE",
        receiveQuotation: b.receiveQuotation ?? true,
      },
    });
    return jsonBig(c, { status: 201 });
  } catch (err) {
    return jsonBig({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
