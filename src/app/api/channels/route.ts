import { handle } from "@/server/http/json";
import { listChannels, createChannel } from "@/server/services/channelService";
import { createChannelSchema } from "@/server/validation/channel.schema";

// GET: danh sách kênh — chỉ trả api_key_env (tên biến), KHÔNG bao giờ trả key thật.
export async function GET() {
  return handle(() => listChannels(), 500);
}

export async function POST(req: Request) {
  return handle(async () => createChannel(createChannelSchema.parse(await req.json())));
}
