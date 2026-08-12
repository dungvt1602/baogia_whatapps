import { handle } from "@/server/http/json";
import { listInbound } from "@/server/services/inboundService";

export async function GET() {
  return handle(() => listInbound(), 500);
}
