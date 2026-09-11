import { handle } from "@/server/http/json";
import { listChannels, createChannel } from "@/server/services/channelService";
import { createChannelSchema } from "@/server/validation/channel.schema";
import { audit, labelOf, diffSummary } from "@/server/services/auditService";

// GET: danh sách kênh — chỉ trả api_key_env (tên biến), KHÔNG bao giờ trả key thật.
export async function GET() {
  return handle(() => listChannels(), 500);
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = createChannelSchema.parse(await req.json());
    const c = await createChannel(input);
    await audit(req, {
      action: "KENH_GUI_TAO",
      target: labelOf("channel", c as unknown as Record<string, unknown>),
      note: diffSummary(null, input as Record<string, unknown>),
    });
    return c;
  });
}
