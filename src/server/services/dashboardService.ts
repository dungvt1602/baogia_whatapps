import "server-only";
import { prisma } from "@/server/db/prisma";

// Số liệu tổng hợp cho trang Tổng quan.
export async function getDashboardStats() {
  const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const [
    customers, templates, channels, users,
    customerActive, recentActivity, batchGroups,
    recentReplies, repliesLast3d, customersRepliedRows,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.template.count(),
    prisma.channel.count(),
    prisma.user.count(),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.sendBatch.groupBy({ by: ["status"], _count: { _all: true } }),
    // Phản hồi gần đây của khách (kèm tên + công ty) — cho sếp xem nhanh.
    prisma.inboundMessage.findMany({
      orderBy: { receivedAt: "desc" },
      take: 6,
      include: { customer: { select: { name: true, company: true } } },
    }),
    prisma.inboundMessage.count({ where: { receivedAt: { gte: since3d } } }),
    prisma.inboundMessage.findMany({ where: { customerId: { not: null } }, distinct: ["customerId"], select: { customerId: true } }),
  ]);

  return {
    counts: { customers, templates, channels, users },
    customerActive,
    recentActivity,
    batchStatus: batchGroups.map((g) => ({ status: g.status, count: g._count._all })),
    recentReplies,
    replyStats: { last3d: repliesLast3d, customersReplied: customersRepliedRows.length },
  };
}
