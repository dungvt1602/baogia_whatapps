import "server-only";
import { prisma } from "@/server/db/prisma";

// Số liệu tổng hợp cho trang Tổng quan.
export async function getDashboardStats() {
  const [
    quotations, customers, products, templates, channels, users,
    customerActive, productActive, agg,
    recentQuotations, recentActivity, batchGroups,
  ] = await Promise.all([
    prisma.quotation.count(),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.template.count(),
    prisma.channel.count(),
    prisma.user.count(),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.quotation.aggregate({ _sum: { totalAmount: true } }),
    prisma.quotation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { templates: true } } },
    }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.sendBatch.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return {
    counts: { quotations, customers, products, templates, channels, users },
    customerActive,
    productActive,
    quotationTotal: agg._sum.totalAmount ?? 0,
    recentQuotations,
    recentActivity,
    batchStatus: batchGroups.map((g) => ({ status: g.status, count: g._count._all })),
  };
}
