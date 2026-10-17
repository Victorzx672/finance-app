import { prisma } from "@/lib/prisma";
import { criarToken } from "@/lib/tokens";
import { enviarConfirmacaoEmail } from "@/lib/email";
import { normalizarEmail, respostaGenerica } from "@/lib/validacao";

/** Aceita usuário ou e-mail. Sempre responde igual, exista a conta ou não. */
export async function POST(req: Request) {
  try {
    const { identificador } = await req.json();
    const valor = typeof identificador === "string" ? identificador.trim() : "";

    if (!valor) return respostaGenerica();

    const user = await prisma.user.findFirst({
      where: valor.includes("@")
        ? { email: normalizarEmail(valor) }
        : { usuario: valor },
    });

    if (user && !user.emailVerificado) {
      const token = await criarToken(user.id, "VERIFICACAO");
      if (token) await enviarConfirmacaoEmail(user.email, user.usuario, token);
    }
  } catch (e) {
    console.error("ERRO AO REENVIAR CONFIRMAÇÃO:", e);
  }

  return respostaGenerica();
}
