import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { erro, lerJson, naoAutorizado, textoValido, valorNaoNegativo, valorPositivo } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const MAX_METAS = 20;

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const metas = await prisma.meta.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    select: { id: true, nome: true, alvo: true, guardado: true, reserva: true },
  });

  return Response.json({ metas });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  if (!textoValido(b.nome, 60)) return erro("Informe o nome da meta.");
  if (!valorPositivo(b.alvo)) return erro("Informe quanto você quer juntar.");

  const guardado = b.guardado ?? 0;
  if (!valorNaoNegativo(guardado)) return erro("O valor já guardado é inválido.");
  if (b.reserva != null && typeof b.reserva !== "boolean") return erro("reserva inválida");

  if ((await prisma.meta.count({ where: { userId } })) >= MAX_METAS) {
    return erro(`Limite de ${MAX_METAS} metas atingido.`);
  }

  const criada = await prisma.meta.create({
    data: {
      userId,
      nome: b.nome.trim(),
      alvo: arredondar(b.alvo),
      guardado: arredondar(guardado),
      reserva: b.reserva === true,
    },
  });

  return Response.json({ success: true, id: criada.id });
}

/**
 * Altera uma meta. Para registrar um depósito, mande `aporte` (negativo = retirada);
 * o valor guardado nunca fica abaixo de zero.
 */
export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");
  if (!Number.isInteger(b.id)) return erro("id inválido");

  const meta = await prisma.meta.findFirst({ where: { id: b.id as number, userId } });
  if (!meta) return erro("Meta não encontrada.", 404);

  const dados: { nome?: string; alvo?: number; guardado?: number; reserva?: boolean } = {};

  if (b.nome !== undefined) {
    if (!textoValido(b.nome, 60)) return erro("Informe o nome da meta.");
    dados.nome = b.nome.trim();
  }

  if (b.alvo !== undefined) {
    if (!valorPositivo(b.alvo)) return erro("Informe quanto você quer juntar.");
    dados.alvo = arredondar(b.alvo);
  }

  if (b.guardado !== undefined) {
    if (!valorNaoNegativo(b.guardado)) return erro("O valor já guardado é inválido.");
    dados.guardado = arredondar(b.guardado);
  }

  if (b.aporte !== undefined) {
    if (typeof b.aporte !== "number" || !Number.isFinite(b.aporte) || Math.abs(b.aporte) >= 1e9) {
      return erro("Valor do depósito inválido.");
    }
    dados.guardado = Math.max(0, arredondar((dados.guardado ?? meta.guardado) + b.aporte));
  }

  if (b.reserva !== undefined) {
    if (typeof b.reserva !== "boolean") return erro("reserva inválida");
    dados.reserva = b.reserva;
  }

  await prisma.meta.update({ where: { id: meta.id }, data: dados });
  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return erro("id inválido");

  await prisma.meta.deleteMany({ where: { id, userId } });
  return Response.json({ success: true });
}
