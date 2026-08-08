import { handle } from "@/server/http/json";
import { confirmSend } from "@/server/services/sendService";
import { confirmSchema } from "@/server/validation/send.schema";

export async function POST(req: Request) {
  return handle(async () => confirmSend(confirmSchema.parse(await req.json())));
}
