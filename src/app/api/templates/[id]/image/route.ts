import { handle } from "@/server/http/json";
import { getTemplateImage, getTemplateImageMeta, setTemplateImage, clearTemplateImage } from "@/server/services/templateService";
import { publicImageUrl } from "@/server/lib/storage";

// GET — ảnh header của template.
// Ảnh trên Storage -> redirect sang URL public (CDN Supabase, có cache, egress rẻ).
// Ảnh legacy trong DB -> serve bytes như cũ.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = await getTemplateImageMeta(id);
  if (!meta) return new Response("Chưa có ảnh", { status: 404 });
  if (meta.storagePath) {
    return Response.redirect(publicImageUrl(meta.storagePath) + `?t=${meta.updatedAt.getTime()}`, 302);
  }
  const img = await getTemplateImage(id);
  if (!img) return new Response("Chưa có ảnh", { status: 404 });
  // Cache được vì UI gắn ?t=<updatedAt> làm cache-buster — đổi ảnh là URL đổi.
  return new Response(new Uint8Array(img.data), {
    headers: { "content-type": img.mime, "cache-control": "private, max-age=86400" },
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
