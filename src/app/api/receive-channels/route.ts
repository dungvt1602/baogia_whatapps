import { handle } from "@/server/http/json";
import { listReceiveChannels, createReceiveChannel } from "@/server/services/receiveChannelService";
import { createReceiveChannelSchema } from "@/server/validation/receiveChannel.schema";

// GET: danh sách kênh nhận — chỉ trả api_key_env (tên biến), KHÔNG bao giờ trả giá trị thật.
export async function GET() {
  return handle(() => listReceiveChannels(), 500);
}

export async function POST(req: Request) {
  return handle(async () => createReceiveChannel(createReceiveChannelSchema.parse(await req.json())));
}
