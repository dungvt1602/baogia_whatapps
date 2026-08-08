import { handle } from "@/server/http/json";
import { listQuotations, createQuotation } from "@/server/services/quotationService";
import { createQuotationSchema } from "@/server/validation/quotation.schema";

export async function GET() {
  return handle(() => listQuotations(), 500);
}

export async function POST(req: Request) {
  return handle(async () => createQuotation(createQuotationSchema.parse(await req.json())));
}
