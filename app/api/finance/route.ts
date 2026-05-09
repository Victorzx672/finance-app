import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const userId = Number(searchParams.get("userId"));
  const mes = searchParams.get("mes");

  if (!userId || !mes) {
    return Response.json(
      { error: "userId e mes são obrigatórios" },
      { status: 400 }
    );
  }

  const finance = await prisma.financeData.findUnique({
    where: {
      userId_mesReferencia: {
        userId,
        mesReferencia: mes,
      },
    },
    include: {
      gastos: true,
    },
  });

  if (!finance) {
    return Response.json({
      finance: null,
      gastos: [],
    });
  }

  return Response.json({
    finance,
    gastos: finance.gastos,
  });
}

export async function POST(req: Request) {
  const {
    userId,
    mes,
    renda,
    gastosFixos,
    gastosVariaveis,
    percentualInvestimento,
    meta,
    gastos,
  } = await req.json();

  if (!userId || !mes) {
    return Response.json(
      { error: "userId e mes são obrigatórios" },
      { status: 400 }
    );
  }

  const finance = await prisma.financeData.upsert({
    where: {
      userId_mesReferencia: {
        userId,
        mesReferencia: mes,
      },
    },

    update: {
      renda,
      gastosFixos,
      gastosVariaveis,
      percentualInvestimento,
      meta,
    },

    create: {
      userId,
      mesReferencia: mes,
      renda,
      gastosFixos,
      gastosVariaveis,
      percentualInvestimento,
      meta,
    },
  });

  await prisma.expense.deleteMany({
    where: {
      financeId: finance.id,
    },
  });

  if (gastos?.length > 0) {
    await prisma.expense.createMany({
      data: gastos.map(
        (gasto: { nome: string; valor: number }) => ({
          nome: gasto.nome,
          valor: gasto.valor,
          financeId: finance.id,
        })
      ),
    });
  }

  return Response.json({
    success: true,
    finance,
  });
}