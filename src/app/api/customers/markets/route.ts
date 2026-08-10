import { handle } from "@/server/http/json";
import { listCustomerMarkets } from "@/server/services/customerService";

// Danh sách quốc gia (market) khác nhau — cho dropdown lọc khách hàng.
export function GET() {
  return handle(() => listCustomerMarkets(), 500);
}
