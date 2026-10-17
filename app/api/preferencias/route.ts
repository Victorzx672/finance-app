import { getUserIdFromSession } from "@/lib/auth";
import { arredondar } from "@/lib/calculos";
import { erro, inteiroEntre, lerJson, naoAutorizado, valorNaoNegativo } from "@/lib/api";
import { cartaoValido, type ConfigCartao } from "@/lib/cartoes";
import { categoriaValida } from "@/lib/categorias";
import { prisma } from "@/lib/prisma";


const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Lê o JSON do banco já limpo (ignora o que não for uma categoria/valor válido). */
function lerOrcamentos(bruto: unknown) {
  const saida: Record<string, number> = {};

  if (ehObjeto(bruto)) {
    for (const [categoria, limite] of Object.entries(bruto)) {
      if (categoriaValida(categoria) && valorNaoNegativo(limite) && limite > 0) saida[categoria] = limite;
    }
  }

  return saida;
}

function lerCartoes(bruto: unknown) {
  const saida: Record<string, ConfigCartao> = {};

  if (ehObjeto(bruto)) {
    for (const [nome, c] of Object.entries(bruto)) {
      if (!cartaoValido(nome) || !ehObjeto(c)) continue;

      saida[nome] = {
        limite: valorNaoNegativo(c.limite) && c.limite > 0 ? c.limite : null,
        fechamento: inteiroEntre(c.fechamento, 1, 31) ? c.fechamento : null,
        vencimento: inteiroEntre(c.vencimento, 1, 31) ? c.vencimento : null,
      };
    }
  }

  return saida;
}

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { alertaEmail: true, orcamentos: true, cartoes: true },
  });

  if (!user) return naoAutorizado();

  return Response.json({
    alertaEmail: user.alertaEmail,
    orcamentos: lerOrcamentos(user.orcamentos),
    cartoes: lerCartoes(user.cartoes),
  });
}

/** Atualiza só o que vier no corpo: alertaEmail, orcamentos (substitui todos) e/ou cartoes. */
export async function PUT(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  const dados: { alertaEmail?: boolean; orcamentos?: Record<string, number>; cartoes?: Record<string, ConfigCartao> } = {};

  if (b.alertaEmail !== undefined) {
    if (typeof b.alertaEmail !== "boolean") return erro("alertaEmail inválido");
    dados.alertaEmail = b.alertaEmail;
  }

  if (b.orcamentos !== undefined) {
    if (!ehObjeto(b.orcamentos)) return erro("orcamentos inválido");

    const orc: Record<string, number> = {};

    for (const [categoria, limite] of Object.entries(b.orcamentos)) {
      if (!categoriaValida(categoria)) return erro(`Categoria inválida: ${categoria}`);
      if (!valorNaoNegativo(limite)) return erro(`Limite inválido para ${categoria}`);
      if (limite > 0) orc[categoria] = arredondar(limite);
    }

    dados.orcamentos = orc;
  }

  if (b.cartoes !== undefined) {
    if (!ehObjeto(b.cartoes)) return erro("cartoes inválido");

    const cartoes: Record<string, ConfigCartao> = {};

    for (const [nome, c] of Object.entries(b.cartoes)) {
      if (!cartaoValido(nome)) return erro(`Cartão inválido: ${nome}`);
      if (!ehObjeto(c)) return erro(`Dados inválidos para ${nome}`);

      if (c.limite != null && !(valorNaoNegativo(c.limite))) return erro("Limite do cartão inválido");
      if (c.fechamento != null && !inteiroEntre(c.fechamento, 1, 31)) return erro("Dia de fechamento inválido (1 a 31)");
      if (c.vencimento != null && !inteiroEntre(c.vencimento, 1, 31)) return erro("Dia de vencimento inválido (1 a 31)");

      cartoes[nome] = {
        limite: typeof c.limite === "number" && c.limite > 0 ? arredondar(c.limite) : null,
        fechamento: (c.fechamento as number | null | undefined) ?? null,
        vencimento: (c.vencimento as number | null | undefined) ?? null,
      };
    }

    dados.cartoes = cartoes;
  }

  await prisma.user.update({ where: { id: userId }, data: dados });
  return Response.json({ success: true });
}
