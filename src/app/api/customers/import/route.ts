import { handle } from "@/server/http/json";
import { importCustomers } from "@/server/services/customerService";
import { audit } from "@/server/services/auditService";

// Nhận mảng khách đã map ở client -> tạo hàng loạt.
export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : Array.isArray(body) ? body : [];
    const r = (await importCustomers(rows)) as Record<string, unknown>;
    const summary = Object.entries(r)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    await audit(req, { action: "KHACH_HANG_NHAP_FILE", target: `${rows.length} dòng`, note: summary || null });
    return r;
  });
}
