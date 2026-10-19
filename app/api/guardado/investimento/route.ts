import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { erro, lerJson, naoAutorizado, valorNaoNegativo } from "@/lib/api";
import { aplicarAporte } from "@/lib/metas";
import { MES_REGEX } from "@/lib/parcelas";
import { prisma } from "@/lib/prisma";
import { registrarSaldoGuardado } from "@/lib/servidor-guardado";

/**
 * "Guardei o que sobrou": soma ao total guardado o "para investir" do mês.
 * `valor` é o quanto do mês já está guardado (0 desfaz). Mandar o mesmo valor de novo
 * não soma de novo: só a diferença em relação ao que já tinha sido guardado entra.
 */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  if (typeof b.mes !== "string" || !MES_REGEX.test(b.mes)) return erro("mes inválido (use AAAA-MM)");
  if (!valorNaoNegativo(b.valor)) return erro("Valor inválido.");

  const valor = arredondar(b.valor);

  const resultado = await prisma.$transaction(async (tx) => {
    const mes = await tx.financeData.findUnique({
      where: { userId_mesReferencia: { userId, mesReferencia: b.mes as string } },
      select: { id: true, investimentoGuardado: true },
    });

    if (!mes) return null;

    const user = await tx.user.findUnique({ where: { id: userId }, select: { guardadoGeral: true } });
    if (!user) return null;

    const diferenca = arredondar(valor - mes.investimentoGuardado);

    await tx.financeData.update({ where: { id: mes.id }, data: { investimentoGuardado: valor } });
    await tx.user.update({
      where: { id: userId },
      data: { guardadoGeral: aplicarAporte(user.guardadoGeral, diferenca) },
    });

    return valor;
  });

  if (resultado === null) return erro("Salve o mês antes de guardar o que sobrou.", 404);

  await registrarSaldoGuardado(userId);
  return Response.json({ success: true, investimentoGuardado: resultado });
}
