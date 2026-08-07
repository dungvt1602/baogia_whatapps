import { NextResponse } from "next/server";

// BACKEND: đây là API chạy trên server (Node.js), không lộ ra client.
// Gọi bằng GET /api/hello
export async function GET() {
  return NextResponse.json({
    message: "Xin chào từ backend Next.js!",
    time: new Date().toISOString(),
  });
}

// Ví dụ nhận dữ liệu từ client bằng POST /api/hello
export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    received: body,
    ok: true,
  });
}
