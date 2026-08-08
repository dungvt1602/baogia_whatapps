import { prisma } from "@/lib/prisma";
import { jsonBig } from "@/lib/json";

// GET /api/send/batches — danh sách lệnh gửi gần đây
export async function GET() {
  const batches = await prisma.sendBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      quotation: { select: { code: true, title: true } },
      template: { select: { name: true } },
      channel: { select: { name: true, type: true } },
      _count: { select: { jobs: true } },
    },
  });
  return jsonBig(batches);
}
