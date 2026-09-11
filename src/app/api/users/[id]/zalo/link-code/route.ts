import { handle } from "@/server/http/json";
import { createZaloLinkCode } from "@/server/services/zaloLinkService";

// Cấp mã kích hoạt 6 số (sống 10 phút). Người dùng nhắn mã này vào OA -> webhook gắn Zalo với tài khoản.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => createZaloLinkCode(id));
}
