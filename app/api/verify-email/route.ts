import { prisma } from "@/lib/prisma";
import { consumirToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  const userId = await consumirToken(token, "VERIFICACAO");

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerificado: new Date() },
    });
  }

  return Response.redirect(
    new URL(`/confirmar-email?status=${userId ? "ok" : "erro"}`, url),
    303
  );
}
