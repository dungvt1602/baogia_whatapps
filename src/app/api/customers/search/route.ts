import { handle } from "@/server/http/json";
import { listCustomersPaged, listCustomerIds } from "@/server/services/customerService";

// Danh sách khách có phân trang + lọc quốc gia + tìm kiếm (cho trang quản lý khách của template).
// Trả { items, total, page, limit }.
// ?idsOnly=1 (+ templateId): CHỌN TẤT CẢ — chỉ trả { ids, total, inTemplateIds } của mọi khách khớp bộ lọc.
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  if (p.get("idsOnly")) {
    return handle(
      () =>
        listCustomerIds({
          market: p.get("market"),
          search: p.get("search"),
          templateId: p.get("templateId"),
        }),
      500,
    );
  }
  return handle(
    () =>
      listCustomersPaged({
        market: p.get("market"),
        search: p.get("search"),
        sort: p.get("sort"),
        dir: p.get("dir"),
        page: Number(p.get("page")) || 1,
        limit: Number(p.get("limit")) || 20,
      }),
    500,
  );
}
