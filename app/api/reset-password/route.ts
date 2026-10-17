import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumirToken } from "@/lib/tokens";
import { SENHA_MIN, senhaValida } from "@/lib/validacao";

export async function POST(req: Request) {
  try {
    const { token, senha } = await req.json();

    if (!senhaValida(senha)) {
      return Response.json(
        { error: `A senha deve ter pelo menos ${SENHA_MIN} caracteres.` },
        { status: 400 }
      );
    }

    const userId = await consumirToken(typeof token === "string" ? token : "", "RECUPERACAO");

    if (!userId) {
      return Response.json(
        { error: "Link inválido ou expirado. Peça um novo." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          senha: await bcrypt.hash(senha, 10),
          // Quem recebeu o e-mail e abriu o link provou que o e-mail é seu.
          ...(user && !user.emailVerificado && { emailVerificado: new Date() }),
        },
      }),
      prisma.tokenEmail.deleteMany({ where: { userId } }),
    ]);

    return Response.json({ success: true });
  } catch (e) {
    console.error("ERRO AO REDEFINIR SENHA:", e);
    return Response.json({ error: "Erro ao redefinir a senha" }, { status: 500 });
  }
}
