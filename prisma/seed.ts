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

  // 3) Kênh gửi (WhatsApp) — api_key_env chỉ là TÊN biến env
  const channel = await prisma.channel.upsert({
    where: { type_accountId: { type: "WHATSAPP", accountId: "+84 90 123 4567" } },
    update: {},
    create: {
      name: "WhatsApp Business",
      type: "WHATSAPP",
      accountId: "+84 90 123 4567",
      apiKeyEnv: "WHATSAPP_TOKEN_MAIN",
    },
  });

  // 4) Báo giá + gán user (N-N qua user_quotations)
  const quotation = await prisma.quotation.upsert({
    where: { code: "BG-2026-0001" },
    update: {},
    create: {
      code: "BG-2026-0001",
      title: "Thanh long ruột đỏ xuất Đức — Q3",
      totalAmount: "48200000",
      currency: "VND",
      status: "DRAFT",
      market: "INDIA",
      userQuotations: {
        create: [{ userId: admin.id, roleInQuotation: "OWNER" }],
      },
    },
  });

  // 5) Báo giá -> Template (gắn kênh mặc định). Nội dung có biến tự điền.
  const template = await prisma.template.create({
    data: {
      quotationId: quotation.id,
      channelId: channel.id,
      name: "Chuẩn quốc tế",
      icon: "🌐",
      body:
        "Kính gửi {khách hàng},\n\nAgo Group xin gửi báo giá {mã} — {tiêu đề}.\n" +
        "Tổng giá trị: {giá}. Hiệu lực đến {hiệu lực}.\n\nRất mong nhận phản hồi từ Quý công ty.",
    },
  });

  // 6) Template -> nhiều Khách hàng (có whatsapp/status/receiveQuotation)
  await prisma.customer.createMany({
    data: [
      { templateId: template.id, name: "Fresh Orient GmbH", whatsappPhone: "84901234001", market: "INDIA", status: "ACTIVE", receiveQuotation: true },
      { templateId: template.id, name: "Al Rawabi Trading", whatsappPhone: "84901234002", market: "INDIA", status: "ACTIVE", receiveQuotation: true },
      { templateId: template.id, name: "Golden Basket Ltd.", whatsappPhone: "84901234003", market: "INDIA", status: "INACTIVE", receiveQuotation: true },
    ],
  });

  const custCount = await prisma.customer.count({ where: { templateId: template.id } });

  console.log("Seed xong:", {
    admin: admin.username,
    quotation: quotation.code,
    template: template.name,
    templateId: template.id.toString(),
    customers: custCount,
    channel: channel.name,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
