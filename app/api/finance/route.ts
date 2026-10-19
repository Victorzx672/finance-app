import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { erro, inteiroEntre, lerJson, naoAutorizado, valorNaoNegativo } from "@/lib/api";
import { arredondar, somar } from "@/lib/calculos";
import { cartaoValido } from "@/lib/cartoes";
import { categoriaValida } from "@/lib/categorias";
import { MES_REGEX } from "@/lib/parcelas";
import { MAX_NOME_PESSOA } from "@/lib/pessoas";
import { verificarAlertaLimite } from "@/lib/servidor-mes";

const MAX_GASTOS = 500;
const MAX_RENDAS = 20;

interface RendaEntrada {
  nome: string;
  valor: number;
}

interface GastoEntrada {
  nome: string;
  valor: number;
  cartao?: string | null;
  categoria?: string | null;
  pessoa?: string | null;
  dia?: number | null;
}

const rendaValida = (r: unknown): r is RendaEntrada => {
  const x = r as Partial<RendaEntrada> | null;

  return (
    !!x &&
    typeof x.nome === "string" &&
    x.nome.trim().length > 0 &&
    x.nome.length <= 60 &&
    valorNaoNegativo(x.valor)
  );
};

const gastoValido = (g: unknown): g is GastoEntrada => {
  const x = g as Partial<GastoEntrada> | null;

  return (
    !!x &&
    typeof x.nome === "string" &&
    x.nome.trim().length > 0 &&
    x.nome.length <= 80 &&
    valorNaoNegativo(x.valor) &&
    (x.cartao == null || cartaoValido(x.cartao)) &&
    (x.categoria == null || categoriaValida(x.categoria)) &&
    (x.pessoa == null || (typeof x.pessoa === "string" && x.pessoa.length <= MAX_NOME_PESSOA)) &&
    (x.dia == null || inteiroEntre(x.dia, 1, 31))
  );
};

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const mes = new URL(req.url).searchParams.get("mes");

  if (!mes || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const finance = await prisma.financeData.findUnique({
    where: { userId_mesReferencia: { userId, mesReferencia: mes } },
    include: { gastos: { orderBy: { id: "asc" } }, rendas: { orderBy: { id: "asc" } } },
  });

  if (!finance) return Response.json({ finance: null, gastos: [], rendas: [] });

  return Response.json({ finance, gastos: finance.gastos, rendas: finance.rendas });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const body = await lerJson(req);
  if (!body) return erro("JSON inválido");

  const { mes, rendas = [], gastosFixos, gastosVariaveis, percentualInvestimento, gastos = [] } = body;

  if (typeof mes !== "string" || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  if (!Array.isArray(rendas) || rendas.length > MAX_RENDAS || !rendas.every(rendaValida)) {
    return erro("Fontes de renda inválidas");
  }

  if (
    !valorNaoNegativo(gastosFixos) ||
    !valorNaoNegativo(gastosVariaveis) ||
    !valorNaoNegativo(percentualInvestimento) ||
    percentualInvestimento > 100
  ) {
    return erro("Valores financeiros inválidos");
  }

  if (!Array.isArray(gastos) || gastos.length > MAX_GASTOS || !gastos.every(gastoValido)) {
    return erro("Gastos inválidos");
  }

  const fontes = (rendas as RendaEntrada[]).map((r) => ({
    nome: r.nome.trim(),
    valor: arredondar(r.valor),
  }));

  // A meta deixou de ser um campo do mês (agora são as "Metas"); a coluna antiga fica como está.
  const dados = {
    // A renda do mês é sempre a soma das fontes (o servidor é quem calcula)
    renda: somar(fontes),
    gastosFixos: arredondar(gastosFixos),
    gastosVariaveis: arredondar(gastosVariaveis),
    percentualInvestimento,
  };

  const finance = await prisma.$transaction(async (tx) => {
    const registro = await tx.financeData.upsert({
      where: { userId_mesReferencia: { userId, mesReferencia: mes } },
      update: dados,
      create: { userId, mesReferencia: mes, ...dados },
    });

    await tx.fonteRenda.deleteMany({ where: { financeId: registro.id } });

    if (fontes.length > 0) {
      await tx.fonteRenda.createMany({
        data: fontes.map((f) => ({ ...f, financeId: registro.id })),
      });
    }

    await tx.expense.deleteMany({ where: { financeId: registro.id } });

    if (gastos.length > 0) {
      await tx.expense.createMany({
        data: (gastos as GastoEntrada[]).map((g) => ({
          nome: g.nome.trim(),
          valor: arredondar(g.valor),
          cartao: g.cartao ?? null,
          categoria: g.categoria ?? null,
          pessoa: g.pessoa?.trim() || null,
          dia: g.dia ?? null,
          financeId: registro.id,
        })),
      });
    }

    return registro;
  });

  await verificarAlertaLimite(userId, mes);

  return Response.json({ success: true, finance });
}
