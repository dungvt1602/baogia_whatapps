import "server-only";
import { prisma } from "@/server/db/prisma";

// Danh sách log gửi từng khách (mới nhất trước) — CHỈ lấy trong `days` ngày gần nhất.
// Kèm mã lệnh / template / báo giá để tra cứu "đã gửi cho khách nào, của báo giá nào".
export function listSendJobs(days = 3, limit = 3000) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.sendJob.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      customer: { select: { company: true } },
      batch: {
        select: {
          template: { select: { name: true } },
        },
      },
    },
  });
}

// Dọn log gửi: XÓA HẾT bản ghi quá `days` ngày — dù SENT hay FAILED (theo yêu cầu).
// Trả về số bản ghi đã xóa. (SendBatch giữ nguyên, chỉ xóa chi tiết từng khách.)
export async function cleanupSendJobs(days = 3) {
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const r = await prisma.sendJob.deleteMany({
    where: { createdAt: { lt: before } },
  });
  return r.count;
}
