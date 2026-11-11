import { describe, expect, it } from "vitest";
import { chaveCompra, inicioDaBusca, transacaoParaCompra } from "@/lib/banco";
import type { TransacaoPluggy } from "@/lib/pluggy";

const t = (x: Partial<TransacaoPluggy>): TransacaoPluggy => ({
  id: "tx1",
  description: "IFOOD *RESTAURANTE",
  amount: -45.9,
  date: "2026-11-10T15:00:00.000Z",
  type: "DEBIT",
  category: "Restaurante",
  ...x,
});

describe("transacaoParaCompra", () => {
  it("converte uma saída em compra com valor positivo", () => {
    expect(transacaoParaCompra(t({}), false)).toMatchObject({
      externoId: "tx1",
      descricao: "IFOOD *RESTAURANTE",
      valor: 45.9,
      cartao: false,
      categoriaBanco: "Restaurante",
    });
  });

  it("ignora entradas e valores zerados", () => {
    expect(transacaoParaCompra(t({ type: "CREDIT", amount: 3000 }), false)).toBeNull();
    expect(transacaoParaCompra(t({ amount: 0 }), false)).toBeNull();
  });

  it("ignora o pagamento da fatura na conta corrente, mas não no cartão", () => {
    const pagamento = t({ description: "Pagamento de fatura" });
    expect(transacaoParaCompra(pagamento, false)).toBeNull();
    expect(transacaoParaCompra(pagamento, true)).not.toBeNull();
  });

  it("ignora transações ainda pendentes (o banco pode trocar o id ao confirmar)", () => {
    expect(transacaoParaCompra(t({ status: "PENDING" }), true)).toBeNull();
    expect(transacaoParaCompra(t({ status: "POSTED" }), true)).not.toBeNull();
  });

  it("guarda o dia do calendário, sem o fuso mudar a data", () => {
    const c = transacaoParaCompra(t({ date: "2026-11-01T00:00:00.000Z" }), false)!;
    expect(c.data.toISOString()).toBe("2026-11-01T00:00:00.000Z");

    const brasilia = transacaoParaCompra(t({ date: "2026-11-01T03:00:00.000Z" }), false)!;
    expect(brasilia.data.toISOString().slice(0, 10)).toBe("2026-11-01");
  });

  it("marca compras do cartão", () => {
    expect(transacaoParaCompra(t({ amount: 120 }), true)).toMatchObject({ valor: 120, cartao: true });
  });
});

describe("inicioDaBusca", () => {
  const agora = new Date("2026-11-11T12:00:00Z");

  it("na primeira vez busca 30 dias para trás", () => {
    expect(inicioDaBusca(null, agora)).toBe("2026-10-12");
  });

  it("depois busca desde 3 dias antes da última sincronização", () => {
    expect(inicioDaBusca(new Date("2026-11-10T12:00:00Z"), agora)).toBe("2026-11-07");
  });
});

describe("chaveCompra", () => {
  it("é igual para a mesma compra vinda de outra conexão", () => {
    const a = transacaoParaCompra(t({ id: "a" }), false)!;
    const b = transacaoParaCompra(t({ id: "b", description: "ifood *restaurante" }), false)!;
    expect(chaveCompra(a)).toBe(chaveCompra(b));
    expect(chaveCompra(a)).not.toBe(chaveCompra({ ...a, valor: 46 }));
  });
});
