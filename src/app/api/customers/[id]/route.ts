import { handle } from "@/server/http/json";
import { updateCustomer, deleteCustomer } from "@/server/services/customerService";
import { patchCustomerSchema } from "@/server/validation/customer.schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => updateCustomer(id, patchCustomerSchema.parse(await req.json())));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => deleteCustomer(id));
}
