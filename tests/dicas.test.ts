import { describe, expect, it } from "vitest";
import { economiaPotencial, gerarDicas, type EntradaDicas } from "@/lib/dicas";
import { passosParaGuardar } from "@/lib/investimentos";

const base: EntradaDicas = {
  renda: 5000,
  totalGastos: 2500,
  categorias: [{ nome: "Moradia", valor: 1500 }, { nome: "Mercado", valor: 1000 }],
  orcamentos: {},
  anterior: null,
  compras: [],
  assinaturas: [],
  gastosFixos: 1500,
  parcelasDoMes: 0,
  limiteCartao: null,
  usadoCartao: 0,
};

const ids = (e: EntradaDicas) => gerarDicas(e).map((d) => d.id);

describe("gerarDicas", () => {
  it("sem renda ou sem gastos não há o que dizer", () => {
    expect(gerarDicas({ ...base, renda: 0 })).toEqual([]);
    expect(gerarDicas({ ...base, totalGastos: 0 })).toEqual([]);
  });

  it("dentro do limite e sem excessos: só a dica positiva", () => {
    expect(ids(base)).toEqual(["dentro-do-limite"]);
  });

  it("avisa de orçamento por categoria estourado e quanto passou", () => {
    const dicas = gerarDicas({ ...base, orcamentos: { Mercado: 800 } });
    const d = dicas.find((x) => x.id === "orcamento-Mercado")!;

    expect(d.tipo).toBe("cortar");
    expect(d.economia).toBe(200);
  });

  it("detecta delivery (3 ou mais pedidos) e estima cortar metade", () => {
    const compras = [
      { nome: "Ifood", valor: 40 },
      { nome: "99 Food", valor: 60 },
      { nome: "Uber Eats", valor: 100 },
      { nome: "Mercado do bairro", valor: 500 },
    ];
    const d = gerarDicas({ ...base, compras }).find((x) => x.id === "delivery")!;

    expect(d.economia).toBe(100);
    expect(d.texto).toContain("3 pedidos");
  });

  it("destaca categoria discricionária pesada e a meta é reduzir 20%", () => {
    const d = gerarDicas({ ...base, categorias: [...base.categorias, { nome: "Lazer", valor: 600 }], totalGastos: 3100 }).find(
      (x) => x.id === "discricionaria-Lazer"
    )!;

    expect(d.economia).toBe(120);
  });

  it("assinaturas: com 3 ou mais, soma e mostra o custo anual", () => {
    const assinaturas = [
      { nome: "Netflix", valor: 40 },
      { nome: "Spotify", valor: 20 },
      { nome: "Claude", valor: 100 },
    ];
    const d = gerarDicas({ ...base, assinaturas }).find((x) => x.id === "assinaturas")!;

    expect(d.economia).toBe(53.33);
    expect(d.texto).toContain("3 assinaturas");
    expect(d.texto).toContain("por ano");
  });

  it("aponta o que mais subiu desde o mês passado (e ignora altas pequenas)", () => {
    const anterior = {
      total: 2000,
      linhas: [
        { nome: "Mercado", valor: 600 },
        { nome: "Moradia", valor: 1490 },
      ],
    };
    const dicas = gerarDicas({ ...base, anterior });

    expect(dicas.map((d) => d.id)).toContain("subiu-Mercado");
    expect(dicas.map((d) => d.id)).not.toContain("subiu-Moradia");
  });

  it("gastos fixos acima de 50% da renda, parcelas pesadas e cartão no limite viram atenção", () => {
    const dicas = gerarDicas({
      ...base,
      gastosFixos: 3000,
      parcelasDoMes: 900,
      limiteCartao: 2000,
      usadoCartao: 1600,
    });

    expect(dicas.map((d) => d.id)).toEqual(expect.arrayContaining(["fixos", "parcelas", "limite-cartao"]));
    expect(dicas.filter((d) => ["fixos", "parcelas", "limite-cartao"].includes(d.id)).every((d) => d.tipo === "atencao")).toBe(true);
  });

  it("mês no vermelho vira a primeira dica; cortes vêm antes de avisos e do 'tudo certo'", () => {
    const dicas = gerarDicas({
      ...base,
      renda: 2000,
      totalGastos: 2500,
      orcamentos: { Mercado: 500 },
      gastosFixos: 1500,
    });

    expect(dicas[0].tipo).toBe("cortar");
    expect(dicas.some((d) => d.id === "vermelho")).toBe(true);
    expect(dicas.some((d) => d.tipo === "ok")).toBe(false);
  });
});

describe("economiaPotencial", () => {
  it("soma as economias e nunca passa do total gasto", () => {
    const dicas = [
      { id: "a", tipo: "cortar" as const, titulo: "", texto: "", economia: 300 },
      { id: "b", tipo: "atencao" as const, titulo: "", texto: "", economia: 100 },
      { id: "c", tipo: "ok" as const, titulo: "", texto: "", economia: 50 },
    ];

    expect(economiaPotencial(dicas, 1000)).toBe(400);
    expect(economiaPotencial(dicas, 250)).toBe(250);
  });
});

describe("passosParaGuardar", () => {
  const args = { mesesIdeais: 6, temMetaDeReserva: true, saldoDoMes: 500 };

  it("a reserva fica pendente enquanto não cobre os meses ideais", () => {
    const reserva = passosParaGuardar({ ...args, mesesDeReserva: 2.5 }).find((p) => p.id === "reserva")!;

    expect(reserva.status).toBe("pendente");
    expect(reserva.texto).toContain("2,5 de 6");
  });

  it("completa vira 'feito'; sem meta de reserva manda criar uma", () => {
    expect(passosParaGuardar({ ...args, mesesDeReserva: 6 }).find((p) => p.id === "reserva")!.status).toBe("feito");
    expect(passosParaGuardar({ ...args, mesesDeReserva: 0, temMetaDeReserva: false }).find((p) => p.id === "reserva")!.texto).toContain(
      "Crie uma"
    );
  });
});
