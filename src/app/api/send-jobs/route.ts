import { handle } from "@/server/http/json";
import { listSendJobs } from "@/server/services/sendJobService";

export async function GET() {
  return handle(() => listSendJobs(), 500);
}
