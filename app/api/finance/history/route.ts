import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId"));

  if (!userId) {
    return Response.json({ error: "userId obrigatório" }, { status: 400 });
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