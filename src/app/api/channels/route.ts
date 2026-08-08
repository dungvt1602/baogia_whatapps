import { prisma } from "@/lib/prisma";
import { jsonBig } from "@/lib/json";

// GET /api/channels -> danh sách kênh gửi báo giá.
// Chỉ trả về TÊN biến env (api_key_env), KHÔNG bao giờ trả key thật.
export async function GET() {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
  });
  return jsonBig(channels);
}

// POST /api/channels -> tạo kênh mới
// body: { name, type, accountId, apiKeyEnv, note? }
export async function POST(request: Request) {
  const body = await request.json();
  const channel = await prisma.channel.create({
    data: {
      name: body.name,
      type: body.type, // TELEGRAM | ZALO | WHATSAPP
      accountId: body.accountId,
      apiKeyEnv: body.apiKeyEnv, // chỉ là TÊN biến env, không phải key thật
      note: body.note ?? null,
    },
  });
  return jsonBig(channel, { status: 201 });
}
