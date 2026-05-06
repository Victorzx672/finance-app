import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function POST(req: Request) {
  try {
    const { usuario, senha } = await req.json();

    const user = await prisma.user.findUnique({
      where: { usuario },
    });

    if (!user) {
      return Response.json({ error: "Usuário não encontrado" }, { status: 400 });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return Response.json({ error: "Senha incorreta" }, { status: 400 });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        usuario: user.usuario,
      },
    });
  } catch (error) {
    console.error("ERRO NO LOGIN:", error);
    return Response.json({ error: "Erro no login" }, { status: 500 });
  }
}