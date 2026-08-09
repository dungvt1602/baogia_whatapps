import { handle } from "@/server/http/json";
import { updateChannel, deleteChannel } from "@/server/services/channelService";
import { updateChannelSchema } from "@/server/validation/channel.schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => updateChannel(id, updateChannelSchema.parse(await req.json())));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => deleteChannel(id));
}
