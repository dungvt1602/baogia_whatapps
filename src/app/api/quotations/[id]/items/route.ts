import { handle } from "@/server/http/json";
import { listItems, setItems } from "@/server/services/quotationService";
import { setItemsSchema } from "@/server/validation/quotation.schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => listItems(id), 500);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => setItems(id, setItemsSchema.parse(await req.json()).items));
}
