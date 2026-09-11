import { handle } from "@/server/http/json";
import { previewSend } from "@/server/services/sendService";
import { previewSchema } from "@/server/validation/send.schema";
import { actorFromRequest } from "@/server/services/auditService";

export async function POST(req: Request) {
  return handle(async () => {
    const input = previewSchema.parse(await req.json());
    const a = actorFromRequest(req);
    return previewSend({ ...input, actor: { id: input.actor?.id ?? a.id, name: input.actor?.name ?? a.name } });
  });
}
