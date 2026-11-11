import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizarConexao } from "@/lib/servidor-banco";

const EVENTOS = new Set(["item/updated", "transactions/created", "transactions/updated"]);

const tokenCerto = (recebido: string | null, segredo: string) => {
  const a = Buffer.from(recebido ?? "");
  const b = Buffer.from(segredo);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * A Pluggy chama aqui quando o banco tem novidade, mandando o segredo no cabeçalho
 * X-Webhook-Secret (cadastrado por scripts/registrar-webhook.mjs). O aviso serve só de sinal: não usamos os
 * dados dele, apenas o itemId, e buscamos as transações na API com a nossa chave. Respondemos
 * na hora (a Pluggy espera no máximo 10 s) e sincronizamos depois, com after().
 */
export async function POST(req: Request) {
  const segredo = process.env.PLUGGY_WEBHOOK_SECRET;

  if (!segredo || !tokenCerto(req.headers.get("x-webhook-secret"), segredo)) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => null)) as { event?: string; itemId?: string } | null;

  if (corpo?.event && EVENTOS.has(corpo.event) && typeof corpo.itemId === "string") {
    const itemId = corpo.itemId;

    after(async () => {
      const conexao = await prisma.conexaoBanco.findUnique({ where: { itemId } });
      if (!conexao) return;

      await sincronizarConexao(conexao).catch((e) => console.error("ERRO NO WEBHOOK DO BANCO:", itemId, e));
    });
  }

  return Response.json({ ok: true });
}
