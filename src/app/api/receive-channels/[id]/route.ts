import { handle } from "@/server/http/json";
import { updateReceiveChannel, deleteReceiveChannel } from "@/server/services/receiveChannelService";
import { updateReceiveChannelSchema } from "@/server/validation/receiveChannel.schema";
import { audit, snapshot, labelOf, diffSummary } from "@/server/services/auditService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = updateReceiveChannelSchema.parse(await req.json());
    const before = await snapshot("receiveChannel", id);
    const r = await updateReceiveChannel(id, input);
    await audit(req, {
      action: "KENH_NHAN_SUA",
      target: labelOf("receiveChannel", before, id),
      note: diffSummary(before, input as Record<string, unknown>) || "không đổi gì",
    });
    return r;
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const before = await snapshot("receiveChannel", id);
    const r = await deleteReceiveChannel(id);
    await audit(req, { action: "KENH_NHAN_XOA", target: labelOf("receiveChannel", before, id), note: before ? `nhận: ${before.accountId}` : null });
    return r;
  });
}
