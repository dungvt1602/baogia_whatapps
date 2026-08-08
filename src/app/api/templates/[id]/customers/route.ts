import { handle } from "@/server/http/json";
import { listTemplateCustomers } from "@/server/services/templateService";
import { createCustomer } from "@/server/services/customerService";
import { createCustomerSchema } from "@/server/validation/customer.schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => listTemplateCustomers(id), 500);
}

// Tạo khách gắn thẳng vào template này.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = createCustomerSchema.parse(await req.json());
    return createCustomer({ ...input, templateId: id });
  });
}
