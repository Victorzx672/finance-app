import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { erro, lerJson, naoAutorizado, valorNaoNegativo } from "@/lib/api";
import { aplicarAporte } from "@/lib/metas";
import { prisma } from "@/lib/prisma";

/** Dinheiro guardado que não está em nenhuma meta. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { guardadoGeral: true } });
  if (!user) return naoAutorizado();

  return Response.json({ guardadoGeral: user.guardadoGeral });
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

  return Response.json({ success: true });
}
