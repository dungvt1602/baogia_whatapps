import { handle } from "@/server/http/json";
import { updateProduct, deleteProduct } from "@/server/services/productService";
import { updateProductSchema } from "@/server/validation/product.schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => updateProduct(id, updateProductSchema.parse(await req.json())));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => deleteProduct(id));
}
