import { prisma } from "@/lib/prisma";
import { jsonBig } from "@/lib/json";

// GET /api/send/batches/[id] — chi tiết lệnh gửi + trạng thái từng khách
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await prisma.sendBatch.findUnique({
    where: { id: BigInt(id) },
    include: {
      quotation: { select: { code: true, title: true } },
      template: { select: { name: true } },
      channel: { select: { name: true, type: true } },
      jobs: { orderBy: { id: "asc" } },
    },
  });
  if (!batch) return jsonBig({ error: "Không tìm thấy lệnh gửi." }, { status: 404 });
  return jsonBig(batch);
}
