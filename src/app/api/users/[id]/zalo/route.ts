import { handle } from "@/server/http/json";
import { getZaloLinkStatus, unlinkZalo } from "@/server/services/zaloLinkService";

// Trạng thái kích hoạt Zalo của 1 người dùng (modal "Kích hoạt Zalo" poll endpoint này mỗi vài giây).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => getZaloLinkStatus(id), 500);
}

// Huỷ kích hoạt: không báo phản hồi khách về Zalo này nữa.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => unlinkZalo(id));
}
