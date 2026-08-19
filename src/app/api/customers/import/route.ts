import { handle } from "@/server/http/json";
import { importCustomers } from "@/server/services/customerService";

// Nhận mảng khách đã map ở client -> tạo hàng loạt.
export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : Array.isArray(body) ? body : [];
    return importCustomers(rows);
  });
}
