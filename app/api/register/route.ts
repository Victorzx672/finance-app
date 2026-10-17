import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { criarToken } from "@/lib/tokens";
import { enviarConfirmacaoEmail } from "@/lib/email";
import {
  SENHA_MIN,
  emailValido,
  normalizarEmail,
  senhaValida,
  usuarioValido,
} from "@/lib/validacao";

const erro = (mensagem: string, status = 400) =>
  Response.json({ error: mensagem }, { status });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const usuario = typeof body.usuario === "string" ? body.usuario.trim() : "";
    const email = normalizarEmail(body.email);
    const { senha } = body;

    if (!usuarioValido(usuario)) {
      return erro("Usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou _.");
    }

    if (!emailValido(email)) return erro("Informe um e-mail válido.");

    if (!senhaValida(senha)) {
      return erro(`A senha deve ter pelo menos ${SENHA_MIN} caracteres.`);
    }

    const existente = await prisma.user.findFirst({
      where: { OR: [{ usuario }, { email }] },
      select: { usuario: true },
    });

    if (existente) {
      return erro(
        existente.usuario === usuario
          ? "Esse usuário já existe."
          : "Esse e-mail já está cadastrado."
      );
    }

    const user = await prisma.user.create({
      data: { usuario, email, senha: await bcrypt.hash(senha, 10) },
    });

    let emailEnviado = true;

    try {
      const token = await criarToken(user.id, "VERIFICACAO");
      if (token) await enviarConfirmacaoEmail(email, usuario, token);
    } catch (e) {
      // A conta existe; o usuário pode pedir o reenvio na tela de login.
      console.error("ERRO AO ENVIAR E-MAIL DE CONFIRMAÇÃO:", e);
      emailEnviado = false;
    }

    return Response.json({ success: true, emailEnviado });
  } catch (e) {
    console.error("ERRO AO CADASTRAR:", e);
    return erro("Erro ao cadastrar usuário", 500);
  }
}
