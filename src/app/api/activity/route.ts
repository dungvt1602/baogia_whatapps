import { handle } from "@/server/http/json";
import { listActivity } from "@/server/services/activityService";

export async function GET() {
  return handle(() => listActivity(), 500);
}
