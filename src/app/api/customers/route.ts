import { handle } from "@/server/http/json";
import { listCustomers, createCustomer } from "@/server/services/customerService";
import { createCustomerSchema } from "@/server/validation/customer.schema";

export async function GET(request: Request) {
  const exclude = new URL(request.url).searchParams.get("excludeTemplate");
  return handle(() => listCustomers(exclude), 500);
}

export async function POST(req: Request) {
  return handle(async () => createCustomer(createCustomerSchema.parse(await req.json())));
}
