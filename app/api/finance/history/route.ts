import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { naoAutorizado } from "@/lib/api";
import { resumoDoMes } from "@/lib/resumo-mes";

/** Resumo de cada mês salvo (mais recente primeiro), com a mesma conta da tela. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const [meses, parcelamentos, contas] = await Promise.all([
    prisma.financeData.findMany({
      where: { userId },
      include: { gastos: true },
      orderBy: { mesReferencia: "desc" },
    }),
    prisma.parcelamento.findMany({ where: { userId } }),
    prisma.contaFixa.findMany({ where: { userId } }),
  ]);

  const historico = meses.map((mes) => {
    const { saldo, totalGastos } = resumoDoMes(mes, parcelamentos, contas);

    return {
      id: mes.id,
      mesReferencia: mes.mesReferencia,
      renda: mes.renda,
      saldo,
      totalGastos,
    };
  });

  return Response.json({ historico });
}
