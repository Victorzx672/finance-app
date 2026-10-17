import { prisma } from "@/lib/prisma";
import { criarToken } from "@/lib/tokens";
import { enviarRecuperacaoSenha } from "@/lib/email";
import { emailValido, normalizarEmail, respostaGenerica } from "@/lib/validacao";

/** Sempre responde igual, exista a conta ou não, para não revelar quem tem cadastro. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizarEmail(body.email);

    if (!emailValido(email)) return respostaGenerica();

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = await criarToken(user.id, "RECUPERACAO");
      if (token) await enviarRecuperacaoSenha(user.email, user.usuario, token);
    }
  } catch (e) {
    console.error("ERRO NA RECUPERAÇÃO DE SENHA:", e);
  }

  return respostaGenerica();
}
