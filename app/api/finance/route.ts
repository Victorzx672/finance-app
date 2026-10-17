import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const naoAutorizado = () =>
  Response.json({ error: "Não autorizado" }, { status: 401 });

const numeroValido = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");

  if (!mes || !MES_REGEX.test(mes)) {
    return Response.json({ error: "mes inválido (use AAAA-MM)" }, { status: 400 });
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
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const {
    mes,
    renda,
    gastosFixos,
    gastosVariaveis,
    percentualInvestimento,
    meta,
    gastos = [],
  } = body;

  if (typeof mes !== "string" || !MES_REGEX.test(mes)) {
    return Response.json({ error: "mes inválido (use AAAA-MM)" }, { status: 400 });
  }

  if (
    !numeroValido(renda) ||
    !numeroValido(gastosFixos) ||
    !numeroValido(gastosVariaveis) ||
    !numeroValido(percentualInvestimento) ||
    !numeroValido(meta) ||
    percentualInvestimento > 100
  ) {
    return Response.json({ error: "Valores financeiros inválidos" }, { status: 400 });
  }

  if (
    !Array.isArray(gastos) ||
    !gastos.every(
      (g) =>
        g &&
        typeof g.nome === "string" &&
        g.nome.trim().length > 0 &&
        numeroValido(g.valor)
    )
  ) {
    return Response.json({ error: "Gastos inválidos" }, { status: 400 });
  }

  const dados = {
    renda,
    gastosFixos,
    gastosVariaveis,
    percentualInvestimento,
    meta,
  };

  const finance = await prisma.$transaction(async (tx) => {
    const registro = await tx.financeData.upsert({
      where: {
        userId_mesReferencia: {
          userId,
          mesReferencia: mes,
        },
      },
      update: dados,
      create: { userId, mesReferencia: mes, ...dados },
    });

    await tx.expense.deleteMany({ where: { financeId: registro.id } });

    if (gastos.length > 0) {
      await tx.expense.createMany({
        data: gastos.map((g: { nome: string; valor: number }) => ({
          nome: g.nome.trim(),
          valor: g.valor,
          financeId: registro.id,
        })),
      });
    }

    return registro;
  });

  return Response.json({
    success: true,
    finance,
  });
}
