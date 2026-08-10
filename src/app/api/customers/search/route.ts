import { handle } from "@/server/http/json";
import { listCustomersPaged } from "@/server/services/customerService";

// Danh sách khách có phân trang + lọc quốc gia + tìm kiếm (cho trang quản lý khách của template).
// Trả { items, total, page, limit }.
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  return handle(
    () =>
      listCustomersPaged({
        market: p.get("market"),
        search: p.get("search"),
        page: Number(p.get("page")) || 1,
        limit: Number(p.get("limit")) || 20,
      }),
    500,
  );
}
