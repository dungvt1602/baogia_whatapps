import { handle } from "@/server/http/json";
import { confirmSend } from "@/server/services/sendService";
import { confirmSchema } from "@/server/validation/send.schema";
import { actorFromRequest } from "@/server/services/auditService";

export async function POST(req: Request) {
  return handle(async () => {
    const input = confirmSchema.parse(await req.json());
    const a = actorFromRequest(req);
    return confirmSend({ ...input, actor: { id: input.actor?.id ?? a.id, name: input.actor?.name ?? a.name } });
  });
}
