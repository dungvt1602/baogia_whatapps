import { handle } from "@/server/http/json";
import { updateChannel, deleteChannel } from "@/server/services/channelService";
import { updateChannelSchema } from "@/server/validation/channel.schema";
import { audit, snapshot, labelOf, diffSummary } from "@/server/services/auditService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = updateChannelSchema.parse(await req.json());
    const before = await snapshot("channel", id);
    const r = await updateChannel(id, input);
    await audit(req, {
      action: "KENH_GUI_SUA",
      target: labelOf("channel", before, id),
      note: diffSummary(before, input as Record<string, unknown>) || "không đổi gì",
    });
    return r;
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const before = await snapshot("channel", id);
    const r = await deleteChannel(id);
    await audit(req, { action: "KENH_GUI_XOA", target: labelOf("channel", before, id) });
    return r;
  });
}
