import { arredondar } from "@/lib/calculos";
import { chaveMes } from "@/lib/meses";
import { totalGuardado } from "@/lib/metas";
import { prisma } from "@/lib/prisma";

/** Total guardado agora (sem meta + metas). Só roda no servidor. */
export async function totalGuardadoDoUsuario(userId: number) {
  const [user, metas] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { guardadoGeral: true } }),
    prisma.meta.findMany({ where: { userId }, select: { guardado: true } }),
  ]);

  return arredondar(totalGuardado(metas, user?.guardadoGeral ?? 0));
}

/**
 * Registra o total guardado de agora no mês atual (o último valor do mês é o que vale).
 * Chamar depois de qualquer mudança no que está guardado. Nunca lança erro.
 */
export async function registrarSaldoGuardado(userId: number) {
  try {
    const total = await totalGuardadoDoUsuario(userId);
    const mes = chaveMes(new Date());

    await prisma.saldoGuardado.upsert({
      where: { userId_mes: { userId, mes } },
      update: { total },
      create: { userId, mes, total },
    });
  } catch (e) {
    console.error("ERRO AO REGISTRAR SALDO GUARDADO:", e);
  }
}
