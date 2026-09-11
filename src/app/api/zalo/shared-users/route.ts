import { handle } from "@/server/http/json";
import { prisma } from "@/server/db/prisma";
import { listSharedZaloBindings } from "@/server/lib/zaloSharedToken";

// Người đã liên kết Zalo bên worker Go (chế độ dùng chung token) -> thêm làm kênh nhận ở web này bằng 1 nút.
// Kèm cờ receiveChannel: đã là kênh nhận ở web này chưa.
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const rows = await listSharedZaloBindings();
    const uids = rows.map((r) => r.zaloUserId).filter(Boolean);
    const channels = uids.length
      ? await prisma.receiveChannel.findMany({ where: { type: "ZALO", accountId: { in: uids } }, select: { accountId: true, name: true, isActive: true } })
      : [];
    const byId = new Map(channels.map((c) => [c.accountId, { name: c.name, isActive: c.isActive }]));
    return rows.map((r) => ({ ...r, receiveChannel: byId.get(r.zaloUserId) ?? null }));
  }, 500);
}
