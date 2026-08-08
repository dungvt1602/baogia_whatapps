import { NextResponse } from "next/server";
import { ZodError } from "zod";

// BigInt không serialize được bằng JSON.stringify mặc định.
// Helper này chuyển mọi BigInt thành string trước khi trả về client.
export function json(data: unknown, init?: ResponseInit) {
  const body = JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return new NextResponse(body, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

// Bọc controller: chạy handler, chuẩn hoá lỗi (zod -> 400, khác -> status tuỳ chọn).
export async function handle(fn: () => Promise<unknown>, errorStatus = 400) {
  try {
    return json(await fn());
  } catch (err) {
    if (err instanceof ZodError) {
      return json({ error: "Dữ liệu không hợp lệ", issues: err.issues }, { status: 400 });
    }
    return json({ error: err instanceof Error ? err.message : String(err) }, { status: errorStatus });
  }
}
