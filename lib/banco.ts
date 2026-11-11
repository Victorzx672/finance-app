// Compras que chegam do banco conectado (Open Finance). A parte sem banco de dados fica
// aqui em cima, para dar para testar.

import type { TransacaoPluggy } from "@/lib/pluggy";

export interface CompraDoBanco {
  externoId: string;
  descricao: string;
  valor: number;
  data: Date;
  cartao: boolean;
  categoriaBanco: string | null;
}

/**
 * Só as saídas já confirmadas viram compra: créditos (salário, estorno, pagamento da fatura)
 * ficam de fora, e as pendentes também, porque o banco pode trocar o id delas ao confirmar
 * (e a compra apareceria duas vezes). Na conta corrente também ignoramos o pagamento da
 * fatura, que já aparece pelo cartão.
 */
export function transacaoParaCompra(t: TransacaoPluggy, cartao: boolean): CompraDoBanco | null {
  if (t.type !== "DEBIT" || t.status === "PENDING") return null;

  const valor = Math.round(Math.abs(t.amount) * 100) / 100;
  if (!(valor > 0)) return null;

  const descricao = (t.description || "Compra").trim().slice(0, 80);
  if (!cartao && /pagamento (de )?fatura/i.test(descricao)) return null;

  return {
    externoId: t.id,
    descricao,
    valor,
    // guarda só o dia do calendário (meia-noite UTC), para o fuso não jogar a compra no dia anterior
    data: new Date(`${t.date.slice(0, 10)}T00:00:00Z`),
    cartao,
    categoriaBanco: t.category,
  };
}

/** Mesma compra (dia, valor e descrição): evita repetir as já decididas quando o banco é reconectado. */
export const chaveCompra = (c: { data: Date; valor: number; descricao: string }) =>
  `${c.data.toISOString().slice(0, 10)}|${c.valor.toFixed(2)}|${c.descricao.toLowerCase()}`;

/** Data ("AAAA-MM-DD") de onde a sincronização começa: 3 dias antes da última, ou 30 dias atrás na primeira. */
export function inicioDaBusca(ultimaSync: Date | null, agora = new Date()) {
  const inicio = ultimaSync
    ? new Date(ultimaSync.getTime() - 3 * 86_400_000)
    : new Date(agora.getTime() - 30 * 86_400_000);

  return inicio.toISOString().slice(0, 10);
}
