import { handle } from "@/server/http/json";
import { linkCustomersToTemplate } from "@/server/services/templateService";

// Gắn hàng loạt khách vào template (trùng bỏ qua). Body: { customerIds: string[] }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.customerIds) ? body.customerIds : [];
    return linkCustomersToTemplate(id, ids);
  });
}
