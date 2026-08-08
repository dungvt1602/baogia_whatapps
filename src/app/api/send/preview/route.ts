import { previewSend } from "@/lib/send/flow";
import { jsonBig } from "@/lib/json";

// POST /api/send/preview
// body: { templateId, channelId?, actor?: { id?, name? } }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await previewSend({
      templateId: body.templateId,
      channelId: body.channelId ?? null,
      actor: body.actor,
    });
    return jsonBig(result);
  } catch (err) {
    return jsonBig({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
