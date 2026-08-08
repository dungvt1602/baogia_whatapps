import { prisma } from "@/lib/prisma";
import { jsonBig } from "@/lib/json";

// GET /api/quotations/[id]/templates — template của 1 báo giá (kèm số khách)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templates = await prisma.template.findMany({
    where: { quotationId: BigInt(id) },
    orderBy: { createdAt: "asc" },
    include: {
      channel: { select: { id: true, name: true, type: true } },
      _count: { select: { customers: true } },
    },
  });
  return jsonBig(templates);
}

// POST /api/quotations/[id]/templates — tạo template cho báo giá
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await request.json();
    const tpl = await prisma.template.create({
      data: {
        quotationId: BigInt(id),
        name: b.name,
        icon: b.icon ?? null,
        body: b.body ?? b.content ?? null,
        channelId: b.channelId ? BigInt(b.channelId) : null,
      },
    });
    return jsonBig(tpl, { status: 201 });
  } catch (err) {
    return jsonBig({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
