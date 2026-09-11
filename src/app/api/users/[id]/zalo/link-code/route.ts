import { handle } from "@/server/http/json";
import { createZaloLinkCode } from "@/server/services/zaloLinkService";
import { audit } from "@/server/services/auditService";

// Cấp mã kích hoạt 6 số (sống 10 phút). Người dùng nhắn mã này vào OA -> webhook gắn Zalo với tài khoản.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const r = await createZaloLinkCode(id);
    await audit(req, { action: "ZALO_LAY_MA", target: r.userName, note: "mã hiệu lực 10 phút (không ghi mã)" });
    return r;
  });
}
