import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { naoAutorizado } from "@/lib/api";
import { labelMes } from "@/lib/meses";
import { numeroDaParcela } from "@/lib/parcelas";
import { contasDoMes } from "@/lib/resumo-mes";

/** Escapa um campo para CSV e neutraliza fórmulas (=, +, -, @) ao abrir no Excel. */
const campo = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 1234.5 -> "1234,50" (Excel em português). */
const dinheiro = (v: number) => v.toFixed(2).replace(".", ",");

/** Baixa todos os meses salvos em CSV (separador ";", abre direto no Excel). */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const [meses, parcelamentos, contas] = await Promise.all([
    prisma.financeData.findMany({
      where: { userId },
      include: { gastos: { orderBy: { id: "asc" } }, rendas: { orderBy: { id: "asc" } } },
      orderBy: { mesReferencia: "asc" },
    }),
    prisma.parcelamento.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    prisma.contaFixa.findMany({ where: { userId }, orderBy: [{ dia: "asc" }, { id: "asc" }] }),
  ]);

  const linhas: (string | number)[][] = [
    ["Mês", "Dia", "Tipo", "Descrição", "Categoria", "Cartão", "Parcela", "Valor (R$)"],
  ];

  const add = (
    mes: string,
    tipo: string,
    descricao: string,
    valor: number,
    extra: { dia?: number | null; categoria?: string | null; cartao?: string | null; parcela?: string } = {}
  ) =>
    linhas.push([
      labelMes(mes),
      extra.dia ?? "",
      tipo,
      descricao,
      extra.categoria ?? "",
      extra.cartao ?? "",
      extra.parcela ?? "",
      dinheiro(valor),
    ]);

  for (const m of meses) {
    const mes = m.mesReferencia;

    // Uma linha por fonte de renda (ou o total, se o mês não tiver fontes)
    if (m.rendas.length > 0) {
      for (const r of m.rendas) add(mes, "Renda", r.nome, r.valor);
    } else {
      add(mes, "Renda", "Renda do mês", m.renda);
    }

    if (m.gastosFixos > 0) add(mes, "Gasto fixo", "Outros gastos fixos", m.gastosFixos);
    add(mes, "Gasto variável", "Gastos variáveis", m.gastosVariaveis);

    for (const c of contasDoMes(contas, mes)) {
      add(mes, "Conta fixa", c.nome, c.valor, { dia: c.dia, categoria: c.categoria });
    }

    for (const g of m.gastos) {
      add(mes, g.cartao ? "Compra no cartão" : "Gasto avulso", g.nome, g.valor, {
        dia: g.dia,
        categoria: g.categoria,
        cartao: g.cartao,
      });
    }

    for (const p of parcelamentos) {
      const numero = numeroDaParcela(p, mes);

      if (numero) {
        add(mes, "Compra no cartão", p.nome, p.valorParcela, {
          categoria: p.categoria,
          cartao: p.cartao,
          parcela: `${numero}/${p.totalParcelas}`,
        });
      }
    }
  }

  // BOM no início para o Excel reconhecer acentos (UTF-8)
  const csv = "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n") + "\r\n";
  const hoje = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fluxopay-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
