import { handle } from "@/server/http/json";
import { listCustomers, createCustomer } from "@/server/services/customerService";
import { createCustomerSchema } from "@/server/validation/customer.schema";
import { audit, labelOf, diffSummary } from "@/server/services/auditService";

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
  return handle(async () => {
    const input = createCustomerSchema.parse(await req.json());
    const c = await createCustomer(input);
    await audit(req, { action: "KHACH_HANG_TAO", target: labelOf("customer", c as unknown as Record<string, unknown>), note: diffSummary(null, input as Record<string, unknown>) });
    return c;
  });
}
