import { handle } from "@/server/http/json";
import { updateUser, deleteUser } from "@/server/services/userService";
import { updateUserSchema } from "@/server/validation/user.schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => updateUser(id, updateUserSchema.parse(await req.json())));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => deleteUser(id));
}
