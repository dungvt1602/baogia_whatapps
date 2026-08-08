import "server-only";
import { prisma } from "@/lib/prisma";

// Ghi nhật ký hoạt động (≈ LOG_HOAT_DONG của bot). Không làm hỏng luồng chính nếu lỗi.
export async function logActivity(input: {
  userId?: bigint | number | null;
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
