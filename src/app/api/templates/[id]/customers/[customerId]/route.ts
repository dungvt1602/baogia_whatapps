import { handle } from "@/server/http/json";
import { addCustomerToTemplate, removeCustomerFromTemplate } from "@/server/services/customerService";

// Gắn 1 khách hiện có vào template (tạo link N-N).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  const { id, customerId } = await params;
  return handle(() => addCustomerToTemplate(id, customerId));
}

// Gỡ 1 khách khỏi template (xoá link, khách vẫn còn ở template khác).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  const { id, customerId } = await params;
  return handle(() => removeCustomerFromTemplate(id, customerId));
}
