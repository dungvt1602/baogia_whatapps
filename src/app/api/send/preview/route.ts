import { handle } from "@/server/http/json";
import { previewSend } from "@/server/services/sendService";
import { previewSchema } from "@/server/validation/send.schema";

export async function POST(req: Request) {
  return handle(async () => previewSend(previewSchema.parse(await req.json())));
}
