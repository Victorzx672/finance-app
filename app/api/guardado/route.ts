import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { erro, lerJson, naoAutorizado, valorNaoNegativo } from "@/lib/api";
import { aplicarAporte } from "@/lib/metas";
import { prisma } from "@/lib/prisma";
import { registrarSaldoGuardado } from "@/lib/servidor-guardado";

/** Dinheiro guardado sem meta + a foto mensal do total guardado (para o gráfico de evolução). */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { guardadoGeral: true } });
  if (!user) return naoAutorizado();

  // Garante que o mês atual já tem um ponto (o gráfico começa no dia em que o app é aberto)
  await registrarSaldoGuardado(userId);

  const saldos = await prisma.saldoGuardado.findMany({
    where: { userId },
    orderBy: { mes: "asc" },
    select: { mes: true, total: true },
  });

  return Response.json({ guardadoGeral: user.guardadoGeral, saldos });
}

/**
 * Altera o valor guardado. Mande `valor` para definir o total exato, ou `aporte`
 * para somar (negativo = retirar); o total nunca fica abaixo de zero.
 */
export async function PUT(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  if (b.valor !== undefined) {
    if (!valorNaoNegativo(b.valor)) return erro("Valor guardado inválido.");

    await prisma.user.update({ where: { id: userId }, data: { guardadoGeral: arredondar(b.valor) } });
    await registrarSaldoGuardado(userId);
    return Response.json({ success: true });
  }

  if (typeof b.aporte !== "number" || !Number.isFinite(b.aporte) || Math.abs(b.aporte) >= 1e9) {
    return erro("Valor inválido.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { guardadoGeral: true } });
  if (!user) return naoAutorizado();

  await prisma.user.update({
    where: { id: userId },
    data: { guardadoGeral: aplicarAporte(user.guardadoGeral, b.aporte) },
  });

  await registrarSaldoGuardado(userId);
  return Response.json({ success: true });
}
