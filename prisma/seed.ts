import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seed dữ liệu mẫu. Chạy: npm run db:seed
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Roles
  const adminRole = await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: {},
    create: { code: "ADMIN", name: "Quản trị viên" },
  });
  const salesRole = await prisma.role.upsert({
    where: { code: "SALES" },
    update: {},
    create: { code: "SALES", name: "Nhân viên kinh doanh" },
  });

  // 2) User + gán role (N-N qua user_roles)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@agoexim.com",
      passwordHash: "REPLACE_WITH_HASH", // nhớ hash mật khẩu thật (vd: bcrypt)
      fullName: "Quản trị viên",
      userRoles: {
        create: [{ roleId: adminRole.id }, { roleId: salesRole.id }],
      },
    },
  });

  // 3) Category -> Template (1-N)
  const category = await prisma.category.upsert({
    where: { slug: "bao-gia" },
    update: {},
    create: { name: "Báo giá", slug: "bao-gia" },
  });
  const template = await prisma.template.create({
    data: {
      categoryId: category.id,
      name: "Mẫu báo giá tiêu chuẩn",
      subject: "Báo giá từ AGO Exim",
      body: "Kính gửi Quý khách, đính kèm báo giá...",
    },
  });

  // 4) Quotation + gán user (N-N qua user_quotations)
  const quotation = await prisma.quotation.create({
    data: {
      code: "BG-2026-0001",
      title: "Báo giá lô hàng mẫu",
      totalAmount: "15000000",
      currency: "VND",
      status: "DRAFT",
      userQuotations: {
        create: [{ userId: admin.id, roleInQuotation: "OWNER" }],
      },
    },
  });

  // 5) Gửi template cho báo giá (quotation_template_sends)
  await prisma.quotationTemplateSend.create({
    data: {
      quotationId: quotation.id,
      templateId: template.id,
      sentTo: "khachhang@example.com",
      status: "PENDING",
    },
  });

  // 6) Customer + audit_log (1-1)
  const customer = await prisma.customer.create({
    data: {
      templateId: template.id,
      name: "Công ty TNHH ABC",
      phone: "0900000000",
      email: "khachhang@example.com",
      auditLog: {
        create: {
          action: "CREATE",
          newValue: { name: "Công ty TNHH ABC" },
          changedBy: admin.id,
        },
      },
    },
  });

  console.log("Seed xong:", {
    admin: admin.username,
    quotation: quotation.code,
    customer: customer.name,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
