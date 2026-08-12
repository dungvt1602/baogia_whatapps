import "server-only";
import { prisma } from "@/server/db/prisma";

// Số liệu tổng hợp cho trang Tổng quan.
export async function getDashboardStats() {
  const [
    customers, templates, channels, users,
    customerActive, recentActivity, batchGroups,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.template.count(),
    prisma.channel.count(),
    prisma.user.count(),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.sendBatch.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return {
    counts: { customers, templates, channels, users },
    customerActive,
    recentActivity,
    batchStatus: batchGroups.map((g) => ({ status: g.status, count: g._count._all })),
  };
}
