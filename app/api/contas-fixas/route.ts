import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { categoriaValida } from "@/lib/categorias";
import { erro, inteiroEntre, lerJson, naoAutorizado, textoValido, valorPositivo } from "@/lib/api";
import { MES_REGEX, somarMes } from "@/lib/parcelas";
import { prisma } from "@/lib/prisma";
import { contaAtiva } from "@/lib/resumo-mes";
import { verificarAlertaLimite } from "@/lib/servidor-mes";

const MAX_CONTAS = 100;

/** Valida os campos comuns de criar e editar. Devolve a mensagem de erro, ou null. */
function validarCampos(b: Record<string, unknown>) {
  if (!textoValido(b.nome)) return "Informe o nome da conta.";
  if (!valorPositivo(b.valor)) return "Informe o valor da conta.";
  if (!inteiroEntre(b.dia, 1, 31)) return "O dia do vencimento deve ser de 1 a 31.";
  if (b.categoria != null && !categoriaValida(b.categoria)) return "Categoria inválida.";
  if (typeof b.mes !== "string" || !MES_REGEX.test(b.mes)) return "mes inválido (use AAAA-MM)";
  return null;
}

/** Contas fixas que valem no mês, e quais já foram pagas (contas e fatura do cartão). */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const mes = new URL(req.url).searchParams.get("mes");
  if (!mes || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const [todas, pagamentos] = await Promise.all([
    prisma.contaFixa.findMany({ where: { userId }, orderBy: [{ dia: "asc" }, { id: "asc" }] }),
    prisma.pagamento.findMany({ where: { userId, mes } }),
  ]);

  return Response.json({
    contas: todas.filter((c) => contaAtiva(c, mes)),
    pagos: pagamentos.map((p) => p.chave),
  });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  const falha = validarCampos(b);
  if (falha) return erro(falha);

  if ((await prisma.contaFixa.count({ where: { userId } })) >= MAX_CONTAS) {
    return erro(`Limite de ${MAX_CONTAS} contas fixas atingido.`);
  }

  const criada = await prisma.contaFixa.create({
    data: {
      userId,
      nome: (b.nome as string).trim(),
      valor: arredondar(b.valor as number),
      dia: b.dia as number,
      categoria: (b.categoria as string | null | undefined) ?? null,
      mesInicio: b.mes as string,
    },
  });

  await verificarAlertaLimite(userId, b.mes as string);
  return Response.json({ success: true, id: criada.id });
}

/**
 * Corrige uma conta A PARTIR do mês informado: o passado fica como estava
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

  const atual = await prisma.contaFixa.findFirst({ where: { id, userId } });
  if (!atual || !contaAtiva(atual, mes)) return erro("Conta não encontrada neste mês.", 404);

  const novo = {
    nome: (b.nome as string).trim(),
    valor: arredondar(b.valor as number),
    dia: b.dia as number,
    categoria: (b.categoria as string | null | undefined) ?? null,
  };

  const mudou =
    atual.nome !== novo.nome ||
    atual.valor !== novo.valor ||
    atual.dia !== novo.dia ||
    atual.categoria !== novo.categoria;

  if (!mudou) return Response.json({ success: true });

  if (atual.mesInicio === mes) {
    await prisma.contaFixa.update({ where: { id }, data: novo });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.contaFixa.update({ where: { id }, data: { mesFim: somarMes(mes, -1) } });

      const nova = await tx.contaFixa.create({
        data: { ...novo, userId, mesInicio: mes, mesFim: atual.mesFim },
      });

      // Os pagamentos deste mês em diante passam a valer para a versão nova
      await tx.pagamento.updateMany({
        where: { userId, chave: `conta:${id}`, mes: { gte: mes } },
        data: { chave: `conta:${nova.id}` },
      });
    });
  }

  await verificarAlertaLimite(userId, mes);
  return Response.json({ success: true });
}

/** Remove a conta deste mês em diante (os meses anteriores continuam com ela). */
export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const params = new URL(req.url).searchParams;
  const id = Number(params.get("id"));
  const mes = params.get("mes");

  if (!Number.isInteger(id) || id <= 0) return erro("id inválido");
  if (!mes || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const atual = await prisma.contaFixa.findFirst({ where: { id, userId } });
  if (!atual) return Response.json({ success: true });

  await prisma.$transaction([
    prisma.pagamento.deleteMany({ where: { userId, chave: `conta:${id}`, mes: { gte: mes } } }),
    atual.mesInicio >= mes
      ? prisma.contaFixa.delete({ where: { id } })
      : prisma.contaFixa.update({ where: { id }, data: { mesFim: somarMes(mes, -1) } }),
  ]);

  await verificarAlertaLimite(userId, mes);
  return Response.json({ success: true });
}
