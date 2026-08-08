import { confirmSend } from "@/lib/send/flow";
import { jsonBig } from "@/lib/json";

// POST /api/send/confirm  body: { batchId, actor? }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await confirmSend({ batchId: body.batchId, actor: body.actor });
    return jsonBig(result);
  } catch (err) {
    return jsonBig({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
