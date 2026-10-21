import { describe, expect, it } from "vitest";
import { limiteLivre, parcelasFuturas, restanteParcelas, resumoFatura, situacaoFatura } from "@/lib/fatura-cartao";

const compras = [
  { nome: "Mercado", valor: 300 },
  { nome: "Cinema", valor: 50.5 },
  { nome: "Notebook", valor: 450, parcela: { numero: 4, total: 10 } },
  { nome: "Geladeira", valor: 280, parcela: { numero: 5, total: 6 } },
];

describe("resumoFatura", () => {
  it("separa à vista e parcelas e acha a maior compra", () => {
    const r = resumoFatura(compras);
    expect(r.total).toBe(1080.5);
    expect(r.aVista).toEqual({ valor: 350.5, quantidade: 2 });
    expect(r.parcelas).toEqual({ valor: 730, quantidade: 2 });
    expect(r.maior?.nome).toBe("Notebook");
  });

  it("fatura vazia", () => {
    const r = resumoFatura([]);
    expect(r.total).toBe(0);
    expect(r.maior).toBeNull();
  });
});

describe("parcelasFuturas", () => {
  it("soma as parcelas que ainda caem em cada um dos próximos meses", () => {
    expect(parcelasFuturas(compras, 3)).toEqual([
      { delta: 1, valor: 730, quantidade: 2 }, // notebook 5/10 e geladeira 6/6
      { delta: 2, valor: 450, quantidade: 1 }, // a geladeira acabou
      { delta: 3, valor: 450, quantidade: 1 },
    ]);
  });

  it("sem parcelas, os próximos meses ficam zerados", () => {
    expect(parcelasFuturas([{ nome: "Pizza", valor: 80 }], 2)).toEqual([
      { delta: 1, valor: 0, quantidade: 0 },
      { delta: 2, valor: 0, quantidade: 0 },
    ]);
  });
});

describe("restanteParcelas e limiteLivre", () => {
  it("o que falta das parcelas fica reservado no limite", () => {
    // notebook: 6 x 450; geladeira: 1 x 280
    expect(restanteParcelas(compras)).toBe(2980);
  });

  it("limite livre desconta a fatura em aberto e as parcelas futuras", () => {
    expect(limiteLivre({ limite: 5000, fatura: 1080.5, paga: false, futuras: 2980 })).toBe(939.5);
  });

  it("fatura paga devolve o limite", () => {
    expect(limiteLivre({ limite: 5000, fatura: 1080.5, paga: true, futuras: 2980 })).toBe(2020);
  });

  it("negativo quando passou do limite", () => {
    expect(limiteLivre({ limite: 1000, fatura: 1200, paga: false, futuras: 0 })).toBe(-200);
  });
});

describe("situacaoFatura", () => {
  const hoje = new Date(2026, 9, 20); // 20/10/2026
  const base = { total: 500, paga: false, vencimento: 25, mes: "2026-10", ehMesAtual: true, hoje };

  it("paga e sem compras vêm antes do prazo", () => {
    expect(situacaoFatura({ ...base, paga: true }).tipo).toBe("paga");
    expect(situacaoFatura({ ...base, total: 0 }).tipo).toBe("sem-compras");
  });

  it("compara o vencimento com hoje no mês atual", () => {
    expect(situacaoFatura(base)).toEqual({ tipo: "aberta", texto: "Vence em 5 dias" });
    expect(situacaoFatura({ ...base, vencimento: 22 })).toEqual({ tipo: "em-breve", texto: "Vence em 2 dias" });
    expect(situacaoFatura({ ...base, vencimento: 20 })).toEqual({ tipo: "hoje", texto: "Vence hoje" });
    expect(situacaoFatura({ ...base, vencimento: 9 })).toEqual({ tipo: "atrasada", texto: "Venceu há 11 dias" });
  });

  it("sem vencimento cadastrado ou em outro mês, só informa", () => {
    expect(situacaoFatura({ ...base, vencimento: null }).texto).toBe("Fatura em aberto");
    expect(situacaoFatura({ ...base, ehMesAtual: false }).texto).toBe("Vence dia 25");
  });
});
