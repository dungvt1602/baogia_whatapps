import { handle } from "@/server/http/json";
import { listTemplates } from "@/server/services/templateService";

export async function GET() {
  return handle(() => listTemplates(), 500);
}
