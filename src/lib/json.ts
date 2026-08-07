import { NextResponse } from "next/server";

// BigInt không serialize được bằng JSON.stringify mặc định.
// Helper này chuyển mọi BigInt thành string trước khi trả về client.
export function jsonBig(data: unknown, init?: ResponseInit) {
  const body = JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return new NextResponse(body, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}
