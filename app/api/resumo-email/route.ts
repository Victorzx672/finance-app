import { getUserIdFromSession } from "@/lib/auth";
import { erro, lerJson, naoAutorizado } from "@/lib/api";
import { limiteDeGastos } from "@/lib/calculos";
import { enviarResumoMensal } from "@/lib/email-resumos";
import { labelMes } from "@/lib/meses";
import { MES_REGEX } from "@/lib/parcelas";
import { prisma } from "@/lib/prisma";
import { carregarResumoMes } from "@/lib/servidor-mes";

const INTERVALO_MS = 30_000;

// Evita disparar vários e-mails seguidos (vale por instância do servidor).
const ultimoEnvio = new Map<number, number>();

/** Envia por e-mail o resumo do mês escolhido para o próprio usuário. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  const mes = b?.mes;

  if (typeof mes !== "string" || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const agora = Date.now();

  if (agora - (ultimoEnvio.get(userId) ?? 0) < INTERVALO_MS) {
    return erro("Aguarde alguns segundos antes de pedir outro resumo.", 429);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, usuario: true },
  });

  if (!user) return naoAutorizado();

  const { finance, resumo, categorias } = await carregarResumoMes(userId, mes);

  if (!finance) return erro("Este mês ainda não tem dados salvos.");

  try {
    await enviarResumoMensal(user.email, user.usuario, {
      mesLabel: labelMes(mes),
      renda: resumo.renda,
      totalGastos: resumo.totalGastos,
      limite: limiteDeGastos(resumo.renda),
      saldo: resumo.saldo,
      investimento: resumo.investimento,
      status: resumo.statusLimite,
      categorias,
    });
  } catch (e) {
    console.error("ERRO AO ENVIAR RESUMO:", e);
    return erro("Não foi possível enviar o e-mail agora.", 502);
  }

  ultimoEnvio.set(userId, agora);
  return Response.json({ success: true, para: user.email });
}
