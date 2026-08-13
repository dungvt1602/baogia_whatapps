import { handle } from "@/server/http/json";
import { updateReceiveChannel, deleteReceiveChannel } from "@/server/services/receiveChannelService";
import { updateReceiveChannelSchema } from "@/server/validation/receiveChannel.schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => updateReceiveChannel(id, updateReceiveChannelSchema.parse(await req.json())));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => deleteReceiveChannel(id));
}
