import { handle } from "@/server/http/json";
import { updateUser, deleteUser } from "@/server/services/userService";
import { updateUserSchema } from "@/server/validation/user.schema";
import { audit, snapshot, labelOf, diffSummary } from "@/server/services/auditService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = updateUserSchema.parse(await req.json());
    const before = await snapshot("user", id);
    const r = await updateUser(id, input);
    await audit(req, {
      action: "NGUOI_DUNG_SUA",
      target: labelOf("user", before, id),
      note: diffSummary(before, input as Record<string, unknown>) || "không đổi gì",
    });
    return r;
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const before = await snapshot("user", id);
    const r = await deleteUser(id);
    await audit(req, { action: "NGUOI_DUNG_XOA", target: labelOf("user", before, id) });
    return r;
  });
}
