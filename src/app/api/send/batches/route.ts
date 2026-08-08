import { handle } from "@/server/http/json";
import { listBatches } from "@/server/services/sendService";

export async function GET() {
  return handle(() => listBatches(), 500);
}
