import { cancelSend } from "@/lib/send/flow";
import { jsonBig } from "@/lib/json";

// POST /api/send/cancel  body: { batchId }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await cancelSend({ batchId: body.batchId });
    return jsonBig(result);
  } catch (err) {
    return jsonBig({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
