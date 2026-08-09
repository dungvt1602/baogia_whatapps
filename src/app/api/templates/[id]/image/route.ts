import { handle } from "@/server/http/json";
import { getTemplateImage, setTemplateImage, clearTemplateImage } from "@/server/services/templateService";

// GET — trả bytes ảnh header của template (hoặc 404 nếu chưa có).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const img = await getTemplateImage(id);
  if (!img) return new Response("Chưa có ảnh", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "content-type": img.mime, "cache-control": "no-store" },
  });
}

// POST — lưu ảnh: body là bytes ảnh, content-type là mime của ảnh (image/png, image/jpeg...).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const mime = req.headers.get("content-type") || "image/png";
    if (!mime.startsWith("image/")) throw new Error("File không phải ảnh.");
    const ab = await req.arrayBuffer();
    if (ab.byteLength === 0) throw new Error("Ảnh rỗng.");
    if (ab.byteLength > 5 * 1024 * 1024) throw new Error("Ảnh quá lớn (tối đa 5MB).");
    return setTemplateImage(id, ab, mime);
  });
}

// DELETE — xóa ảnh header.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => clearTemplateImage(id));
}
