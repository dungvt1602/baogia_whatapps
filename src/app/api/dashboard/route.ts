import { handle } from "@/server/http/json";
import { getDashboardStats } from "@/server/services/dashboardService";

export async function GET() {
  return handle(() => getDashboardStats(), 500);
}
