import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { cartaoValido } from "@/lib/cartoes";
import { categoriaValida } from "@/lib/categorias";
import { erro, lerJson, naoAutorizado, textoValido as nomeValido, valorPositivo as valorValido } from "@/lib/api";
import { MAX_NOME_PESSOA } from "@/lib/pessoas";
import { MAX_PARCELAS, MES_REGEX, numeroDaParcela, somarMes } from "@/lib/parcelas";
import { verificarAlertaLimite } from "@/lib/servidor-mes";

const pessoaValida = (v: unknown) => v == null || (typeof v === "string" && v.length <= MAX_NOME_PESSOA);

/** Parcelas que caem no mês pedido. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const mes = new URL(req.url).searchParams.get("mes");
  if (!mes || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const todos = await prisma.parcelamento.findMany({ where: { userId }, orderBy: { id: "asc" } });

  const parcelas = todos.flatMap((p) => {
    const numero = numeroDaParcela(p, mes);

    return numero
      ? [
          {
            id: `parcela-${p.id}`,
            parcelamentoId: p.id,
            nome: p.nome,
            valor: p.valorParcela,
            cartao: p.cartao,
            categoria: p.categoria,
            pessoa: p.pessoa,
            numero,
            total: p.totalParcelas,
          },
        ]
      : [];
  });

  return Response.json({ parcelas });
}

/**
 * Cria uma compra parcelada. `parcelaAtual` diz em qual parcela o mês `mes` está,
 * então dá para cadastrar compras que já estavam em andamento (ex.: 4 de 10).
 */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const body = await lerJson(req);
  if (!body) return erro("JSON inválido");

  const { nome, valorParcela, totalParcelas, parcelaAtual, mes, cartao, categoria, pessoa } = body;

  if (!nomeValido(nome)) return erro("Informe o nome da compra.");
  if (!valorValido(valorParcela)) return erro("Informe o valor da parcela.");

  if (
    !Number.isInteger(totalParcelas) ||
    (totalParcelas as number) < 2 ||
    (totalParcelas as number) > MAX_PARCELAS
  ) {
    return erro(`O total de parcelas deve ser de 2 a ${MAX_PARCELAS}.`);
  }

  if (
    !Number.isInteger(parcelaAtual) ||
    (parcelaAtual as number) < 1 ||
    (parcelaAtual as number) > (totalParcelas as number)
  ) {
    return erro("A parcela atual deve estar entre 1 e o total de parcelas.");
  }

  if (typeof mes !== "string" || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");
  if (cartao != null && !cartaoValido(cartao)) return erro("Cartão inválido.");
  if (categoria != null && !categoriaValida(categoria)) return erro("Categoria inválida.");
  if (!pessoaValida(pessoa)) return erro("Pessoa inválida.");

  const criado = await prisma.parcelamento.create({
    data: {
      userId,
      nome: nome.trim(),
      valorParcela: arredondar(valorParcela),
      totalParcelas: totalParcelas as number,
      mesInicio: somarMes(mes, -((parcelaAtual as number) - 1)),
      cartao: (cartao as string | null | undefined) ?? null,
      categoria: (categoria as string | null | undefined) ?? null,
      pessoa: (pessoa as string | null | undefined)?.trim() || null,
    },
  });

  await verificarAlertaLimite(userId, mes as string);
  return Response.json({ success: true, id: criado.id });
}

/** Corrige nome, valor da parcela ou categoria (vale para todas as parcelas). */
export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const body = await lerJson(req);
  if (!body) return erro("JSON inválido");

  const { id, nome, valorParcela, categoria, pessoa } = body;

  if (!Number.isInteger(id)) return erro("id inválido");
  if (!nomeValido(nome)) return erro("Informe o nome da compra.");
  if (!valorValido(valorParcela)) return erro("Informe o valor da parcela.");
  if (categoria != null && !categoriaValida(categoria)) return erro("Categoria inválida.");
  if (!pessoaValida(pessoa)) return erro("Pessoa inválida.");

  // updateMany com userId garante que só altera compras do próprio usuário
  const { count } = await prisma.parcelamento.updateMany({
    where: { id: id as number, userId },
    data: {
      nome: nome.trim(),
      valorParcela: arredondar(valorParcela),
      categoria: (categoria as string | null | undefined) ?? null,
      pessoa: (pessoa as string | null | undefined)?.trim() || null,
    },
  });

  return count ? Response.json({ success: true }) : erro("Compra não encontrada.", 404);
}

/** Remove a compra parcelada inteira (todas as parcelas, em todos os meses). */
export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return erro("id inválido");

  // deleteMany com userId garante que só apaga compras do próprio usuário
  await prisma.parcelamento.deleteMany({ where: { id, userId } });

  return Response.json({ success: true });
}
