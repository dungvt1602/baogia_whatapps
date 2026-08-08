import { json } from "@/server/http/json";
import { getBatch } from "@/server/services/sendService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getBatch(id);
  if (!batch) return json({ error: "Không tìm thấy lệnh gửi." }, { status: 404 });
  return json(batch);
}
