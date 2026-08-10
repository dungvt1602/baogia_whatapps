import { handle } from "@/server/http/json";
import { listCustomers, createCustomer } from "@/server/services/customerService";
import { createCustomerSchema } from "@/server/validation/customer.schema";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  return handle(
    () =>
      listCustomers({
        excludeTemplate: p.get("excludeTemplate"),
        market: p.get("market"),
        search: p.get("search"),
      }),
    500,
  );
}

export async function POST(req: Request) {
  return handle(async () => createCustomer(createCustomerSchema.parse(await req.json())));
}
