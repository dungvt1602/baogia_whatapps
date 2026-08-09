import "server-only";
import { prisma } from "@/server/db/prisma";

// Danh sách nhật ký (mới nhất trước) — CHỈ lấy trong `days` ngày gần nhất.
export function listActivity(days = 3, limit = 1000) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.activityLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Dọn nhật ký: xóa log GỬI THÀNH CÔNG (result=SUCCESS) cũ hơn `days` ngày.
// Giữ lại log lỗi để soát. Trả về số bản ghi đã xóa.
export async function cleanupSuccessLogs(days = 3) {
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const r = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: before }, result: "SUCCESS" },
  });
  return r.count;
}

// Ghi nhật ký hoạt động (≈ LOG_HOAT_DONG của bot). Không làm hỏng luồng chính nếu lỗi.
export async function logActivity(input: {
  userId?: bigint | number | string | null;
  actorName?: string | null;
  action: string;
  target?: string | null;
  result?: string | null;
  note?: string | null;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId != null ? BigInt(input.userId) : null,
        actorName: input.actorName ?? null,
        action: input.action,
        target: input.target ?? null,
        result: input.result ?? null,
        note: input.note ?? null,
      },
    });
  } catch {
    // nuốt lỗi ghi log
  }
}
