import { handle } from "@/server/http/json";
import { listReceiveChannels, createReceiveChannel } from "@/server/services/receiveChannelService";
import { createReceiveChannelSchema } from "@/server/validation/receiveChannel.schema";
import { audit, labelOf } from "@/server/services/auditService";

// GET: danh sách kênh nhận — chỉ trả api_key_env (tên biến), KHÔNG bao giờ trả giá trị thật.
export async function GET() {
  return handle(() => listReceiveChannels(), 500);
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = createReceiveChannelSchema.parse(await req.json());
    const c = await createReceiveChannel(input);
    await audit(req, {
      action: "KENH_NHAN_TAO",
      target: labelOf("receiveChannel", c as unknown as Record<string, unknown>),
      note: `nhận: ${input.accountId}${input.note ? " — " + input.note : ""}`,
    });
    return c;
  });
}
