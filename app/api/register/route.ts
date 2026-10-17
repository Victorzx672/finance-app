import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { usuario, senha } = await req.json();

    if (
      typeof usuario !== "string" ||
      typeof senha !== "string" ||
      !usuario.trim() ||
      !senha
    ) {
      return Response.json(
        { error: "Usuário e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const existe = await prisma.user.findUnique({
      where: { usuario },
    });

    if (existe) {
      return Response.json(
        { error: "Usuário já existe" },
        { status: 400 }
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
      data: {
        usuario,
        senha: senhaHash,
      },
    });

    return Response.json({
      success: true,
      user: {
        id: user.id,
        usuario: user.usuario,
      },
    });
  } catch (error) {
    console.error("ERRO AO CADASTRAR:", error);

    return Response.json(
      { error: "Erro ao cadastrar usuário" },
      { status: 500 }
    );
  }
}
