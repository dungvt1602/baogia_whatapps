import { handle } from "@/server/http/json";
import { listProducts, createProduct } from "@/server/services/productService";
import { createProductSchema } from "@/server/validation/product.schema";

export async function GET() {
  return handle(() => listProducts(), 500);
}

export async function POST(req: Request) {
  return handle(async () => createProduct(createProductSchema.parse(await req.json())));
}
