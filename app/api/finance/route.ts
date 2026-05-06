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

  const finance = await prisma.financeData.findUnique({
    where: { userId },
  });

  const gastos = await prisma.expense.findMany({
    where: { userId },
  });

  return Response.json({ finance, gastos });
}

export async function POST(req: Request) {
  const {
    userId,
    renda,
    gastosFixos,
    gastosVariaveis,
    percentualInvestimento,
    meta,
    gastos,
  } = await req.json();

  if (!userId) {
    return Response.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const finance = await prisma.financeData.upsert({
    where: { userId },
    update: {
      renda,
      gastosFixos,
      gastosVariaveis,
      percentualInvestimento,
      meta,
    },
    create: {
      userId,
      renda,
      gastosFixos,
      gastosVariaveis,
      percentualInvestimento,
      meta,
    },
  });

  await prisma.expense.deleteMany({
    where: { userId },
  });

  await prisma.expense.createMany({
    data: gastos.map((gasto: { nome: string; valor: number }) => ({
      nome: gasto.nome,
      valor: gasto.valor,
      userId,
    })),
  });

  return Response.json({ success: true, finance });
}