import { handle } from "@/server/http/json";
import { cancelSend } from "@/server/services/sendService";
import { cancelSchema } from "@/server/validation/send.schema";
import { actorFromRequest } from "@/server/services/auditService";

export async function POST(req: Request) {
  return handle(async () => cancelSend({ ...cancelSchema.parse(await req.json()), actor: actorFromRequest(req) }));
}
