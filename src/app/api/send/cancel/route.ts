import { handle } from "@/server/http/json";
import { cancelSend } from "@/server/services/sendService";
import { cancelSchema } from "@/server/validation/send.schema";

export async function POST(req: Request) {
  return handle(async () => cancelSend(cancelSchema.parse(await req.json())));
}
