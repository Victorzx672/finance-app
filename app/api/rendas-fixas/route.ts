import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { erro, lerJson, naoAutorizado, textoValido, valorPositivo } from "@/lib/api";
import { MES_REGEX, somarMes } from "@/lib/parcelas";
import { prisma } from "@/lib/prisma";
import { contaAtiva } from "@/lib/resumo-mes";
import { verificarAlertaLimite } from "@/lib/servidor-mes";

const MAX_RENDAS_FIXAS = 20;

/** Valida os campos comuns de criar e editar. Devolve a mensagem de erro, ou null. */
function validarCampos(b: Record<string, unknown>) {
  if (!textoValido(b.nome, 60)) return "Informe o nome da renda.";
  if (!valorPositivo(b.valor)) return "Informe o valor da renda.";
  if (typeof b.mes !== "string" || !MES_REGEX.test(b.mes)) return "mes inválido (use AAAA-MM)";
  return null;
}

/** Rendas fixas que valem no mês. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const mes = new URL(req.url).searchParams.get("mes");
  if (!mes || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const todas = await prisma.rendaFixa.findMany({ where: { userId }, orderBy: { id: "asc" } });

  return Response.json({ rendas: todas.filter((r) => contaAtiva(r, mes)) });
}

/** Cria uma renda fixa que vale do mês informado em diante. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  const falha = validarCampos(b);
  if (falha) return erro(falha);

  if ((await prisma.rendaFixa.count({ where: { userId } })) >= MAX_RENDAS_FIXAS) {
    return erro(`Limite de ${MAX_RENDAS_FIXAS} rendas fixas atingido.`);
  }

  const criada = await prisma.rendaFixa.create({
    data: {
      userId,
      nome: (b.nome as string).trim(),
      valor: arredondar(b.valor as number),
      mesInicio: b.mes as string,
    },
  });

  await verificarAlertaLimite(userId, b.mes as string);
  return Response.json({ success: true, id: criada.id });
}

/**
 * Corrige uma renda A PARTIR do mês informado: o passado fica como estava
 * (a versão antiga termina no mês anterior e uma nova começa neste mês).
 */
export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  const falha = validarCampos(b);
  if (falha) return erro(falha);
  if (!Number.isInteger(b.id)) return erro("id inválido");

  const id = b.id as number;
  const mes = b.mes as string;

  const atual = await prisma.rendaFixa.findFirst({ where: { id, userId } });
  if (!atual || !contaAtiva(atual, mes)) return erro("Renda não encontrada neste mês.", 404);

  const novo = { nome: (b.nome as string).trim(), valor: arredondar(b.valor as number) };

  if (atual.nome === novo.nome && atual.valor === novo.valor) return Response.json({ success: true });

  if (atual.mesInicio === mes) {
    await prisma.rendaFixa.update({ where: { id }, data: novo });
  } else {
    await prisma.$transaction([
      prisma.rendaFixa.update({ where: { id }, data: { mesFim: somarMes(mes, -1) } }),
      prisma.rendaFixa.create({ data: { ...novo, userId, mesInicio: mes, mesFim: atual.mesFim } }),
    ]);
  }

  await verificarAlertaLimite(userId, mes);
  return Response.json({ success: true });
}

/** Remove a renda deste mês em diante (os meses anteriores continuam com ela). */
export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const params = new URL(req.url).searchParams;
  const id = Number(params.get("id"));
  const mes = params.get("mes");

  if (!Number.isInteger(id) || id <= 0) return erro("id inválido");
  if (!mes || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const atual = await prisma.rendaFixa.findFirst({ where: { id, userId } });
  if (!atual) return Response.json({ success: true });

  if (atual.mesInicio >= mes) await prisma.rendaFixa.delete({ where: { id } });
  else await prisma.rendaFixa.update({ where: { id }, data: { mesFim: somarMes(mes, -1) } });

  await verificarAlertaLimite(userId, mes);
  return Response.json({ success: true });
}
