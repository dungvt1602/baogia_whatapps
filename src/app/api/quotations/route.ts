import { handle } from "@/server/http/json";
import { listQuotations, createQuotation } from "@/server/services/quotationService";
import { createQuotationSchema } from "@/server/validation/quotation.schema";
import { audit, labelOf, diffSummary } from "@/server/services/auditService";

export async function GET() {
  return handle(() => listQuotations(), 500);
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = createQuotationSchema.parse(await req.json());
    const q = await createQuotation(input);
    await audit(req, {
      action: "BAO_GIA_TAO",
      target: labelOf("quotation", q as unknown as Record<string, unknown>),
      note: diffSummary(null, input as Record<string, unknown>),
    });
    return q;
  });
}
