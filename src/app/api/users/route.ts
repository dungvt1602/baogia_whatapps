import { handle } from "@/server/http/json";
import { listUsers, createUser } from "@/server/services/userService";
import { createUserSchema } from "@/server/validation/user.schema";

export async function GET() {
  return handle(() => listUsers(), 500);
}

export async function POST(req: Request) {
  return handle(async () => createUser(createUserSchema.parse(await req.json())));
}
