import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();

  if (!userId) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const meses = await prisma.financeData.findMany({
    where: { userId },
    include: {
      gastos: true,
    },
    orderBy: {
      mesReferencia: "desc",
    },
  });

  const historico = meses.map((mes) => {
    const totalGastosDetalhados = mes.gastos.reduce(
      (acc, gasto) => acc + gasto.valor,
      0
    );

    const totalGastos =
      mes.gastosFixos + mes.gastosVariaveis + totalGastosDetalhados;

    const saldo = mes.renda - totalGastos;

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
