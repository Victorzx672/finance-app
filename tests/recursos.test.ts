import { describe, expect, it } from "vitest";
import { anosDisponiveis, resumoDoAno } from "@/lib/ano";
import { agruparPorCategoria } from "@/lib/calculos";
import {
  alvoReservaSugerido,
  faltaParaMeta,
  mesesDeReserva,
  metaPrincipal,
  progressoMeta,
  totalNaReserva,
  type MetaDinheiro,
} from "@/lib/metas";
import { contaAtiva, contasDoMes, resumoDoMes } from "@/lib/resumo-mes";
import {
  diaEfetivo,
  diasAteVencimento,
  pedeAtencao,
  situacaoConta,
  textoVencimento,
  ultimoDiaDoMes,
} from "@/lib/vencimentos";

const hoje = new Date(2026, 9, 17); // 17/10/2026

describe("vencimentos", () => {
  it("conhece o último dia de cada mês (inclusive fevereiro)", () => {
    expect(ultimoDiaDoMes("2026-10")).toBe(31);
    expect(ultimoDiaDoMes("2026-11")).toBe(30);
    expect(ultimoDiaDoMes("2026-02")).toBe(28);
    expect(ultimoDiaDoMes("2028-02")).toBe(29);
  });

  it("dia 31 vence no último dia dos meses mais curtos", () => {
    expect(diaEfetivo(31, "2026-02")).toBe(28);
    expect(diaEfetivo(31, "2026-04")).toBe(30);
    expect(diaEfetivo(10, "2026-02")).toBe(10);
  });

  it("conta os dias até o vencimento", () => {
    expect(diasAteVencimento(17, "2026-10", hoje)).toBe(0);
    expect(diasAteVencimento(20, "2026-10", hoje)).toBe(3);
    expect(diasAteVencimento(15, "2026-10", hoje)).toBe(-2);
    expect(diasAteVencimento(5, "2026-11", hoje)).toBe(19);
  });

  it("classifica a situação da conta", () => {
    const s = (dia: number, paga = false, mes = "2026-10") => situacaoConta({ dia, mes, paga, hoje });

    expect(s(10, true)).toBe("paga");
    expect(s(10)).toBe("atrasada");
    expect(s(17)).toBe("hoje");
    expect(s(20)).toBe("em-breve");
    expect(s(21)).toBe("futura");
    expect(s(5, false, "2026-12")).toBe("futura");
    expect(s(5, false, "2026-09")).toBe("atrasada");
  });

  it("só pede atenção quando está perto, hoje ou atrasada", () => {
    expect(pedeAtencao("atrasada")).toBe(true);
    expect(pedeAtencao("hoje")).toBe(true);
    expect(pedeAtencao("em-breve")).toBe(true);
    expect(pedeAtencao("paga")).toBe(false);
    expect(pedeAtencao("futura")).toBe(false);
  });

  it("escreve o prazo em português", () => {
    expect(textoVencimento(0)).toBe("vence hoje");
    expect(textoVencimento(1)).toBe("vence amanhã");
    expect(textoVencimento(5)).toBe("vence em 5 dias");
    expect(textoVencimento(-1)).toBe("venceu ontem");
    expect(textoVencimento(-4)).toBe("venceu há 4 dias");
  });
});

describe("contas fixas por mês", () => {
  const sempre = { valor: 100, mesInicio: "2026-01", mesFim: null };
  const ate = { valor: 50, mesInicio: "2026-01", mesFim: "2026-06" };
  const depois = { valor: 70, mesInicio: "2026-07", mesFim: null };

  it("vale do mês de início até o de fim (inclusive)", () => {
    expect(contaAtiva(ate, "2026-06")).toBe(true);
    expect(contaAtiva(ate, "2026-07")).toBe(false);
    expect(contaAtiva(depois, "2026-06")).toBe(false);
    expect(contaAtiva(depois, "2027-12")).toBe(true);
    expect(contaAtiva(sempre, "2025-12")).toBe(false);
  });

  it("mudar o valor a partir de um mês não altera o passado", () => {
    // versão antiga termina em junho, nova começa em julho
    expect(contasDoMes([ate, depois], "2026-06").map((c) => c.valor)).toEqual([50]);
    expect(contasDoMes([ate, depois], "2026-07").map((c) => c.valor)).toEqual([70]);
  });
});

describe("resumoDoMes (contas fixas + parcelas entram nos gastos)", () => {
  const mes = {
    mesReferencia: "2026-10",
    renda: 5000,
    gastosFixos: 500,
    gastosVariaveis: 300,
    percentualInvestimento: 10,
    gastos: [{ valor: 200 }],
  };

  it("soma tudo", () => {
    const contas = [{ valor: 1000, mesInicio: "2026-01", mesFim: null }];
    const parcelas = [{ valorParcela: 100, mesInicio: "2026-08", totalParcelas: 6 }];
    const r = resumoDoMes(mes, parcelas, contas);

    expect(r.totalGastos).toBe(500 + 300 + 200 + 1000 + 100);
    expect(r.saldo).toBe(5000 - 2100);
  });

  it("ignora contas e parcelas que não caem no mês", () => {
    const contas = [{ valor: 1000, mesInicio: "2026-11", mesFim: null }];
    const parcelas = [{ valorParcela: 100, mesInicio: "2026-01", totalParcelas: 3 }];

    expect(resumoDoMes(mes, parcelas, contas).totalGastos).toBe(1000);
  });
});

describe("agruparPorCategoria", () => {
  it("soma por categoria, ordena e separa fixos e variáveis", () => {
    const r = agruparPorCategoria(
      [
        { valor: 100, categoria: "Lazer" },
        { valor: 50.5, categoria: "Lazer" },
        { valor: 30, categoria: null },
        { valor: 400, categoria: "Mercado" },
      ],
      1000,
      200
    );

    expect(r).toEqual([
      { nome: "Gastos fixos", valor: 1000 },
      { nome: "Mercado", valor: 400 },
      { nome: "Gastos variáveis", valor: 200 },
      { nome: "Lazer", valor: 150.5 },
      { nome: "Sem categoria", valor: 30 },
    ]);
  });

  it("não lista o que é zero", () => {
    expect(agruparPorCategoria([], 0, 0)).toEqual([]);
  });
});

describe("resumo do ano", () => {
  const h = [
    { mesReferencia: "2026-01", renda: 5000, totalGastos: 2000, saldo: 3000 },
    { mesReferencia: "2026-02", renda: 5000, totalGastos: 3500, saldo: 1500 }, // acima de 60%
    { mesReferencia: "2025-12", renda: 4000, totalGastos: 1000, saldo: 3000 },
  ];

  it("lista os anos com dados, sempre com o atual", () => {
    expect(anosDisponiveis(h, 2026)).toEqual([2026, 2025]);
    expect(anosDisponiveis([], 2026)).toEqual([2026]);
  });

  it("calcula totais, média, mês mais caro e meses acima do limite", () => {
    const r = resumoDoAno(h, 2026);

    expect(r.meses.map((m) => m.mesReferencia)).toEqual(["2026-01", "2026-02"]);
    expect(r.rendaTotal).toBe(10000);
    expect(r.gastosTotal).toBe(5500);
    expect(r.saldoTotal).toBe(4500);
    expect(r.mediaGastos).toBe(2750);
    expect(r.mesMaisCaro?.mesReferencia).toBe("2026-02");
    expect(r.mesesAcimaDoLimite).toBe(1);
    expect(r.percentualMedio).toBeCloseTo(55);
  });

  it("ano sem meses salvos devolve zeros", () => {
    const r = resumoDoAno(h, 2030);
    expect(r.meses).toHaveLength(0);
    expect(r.mediaGastos).toBe(0);
    expect(r.mesMaisCaro).toBeNull();
  });
});

describe("metas e reserva de emergência", () => {
  const metas: MetaDinheiro[] = [
    { id: 2, nome: "Viagem", alvo: 5000, guardado: 1000, reserva: false },
    { id: 1, nome: "Reserva", alvo: 12000, guardado: 6000, reserva: true },
    { id: 3, nome: "Concluída", alvo: 100, guardado: 100, reserva: false },
  ];

  it("calcula progresso e o que falta", () => {
    expect(progressoMeta(metas[0])).toBe(20);
    expect(progressoMeta({ alvo: 100, guardado: 250 })).toBe(100);
    expect(faltaParaMeta(metas[0])).toBe(4000);
    expect(faltaParaMeta(metas[2])).toBe(0);
  });

  it("a meta principal é a primeira (por criação) ainda não concluída", () => {
    expect(metaPrincipal(metas)?.nome).toBe("Reserva");
    expect(metaPrincipal([metas[2]])).toBeNull();
  });

  it("a reserva cobre N meses de gastos", () => {
    expect(totalNaReserva(metas)).toBe(6000);
    expect(mesesDeReserva(metas, 3000)).toBe(2);
    expect(mesesDeReserva(metas, 0)).toBe(0);
    expect(alvoReservaSugerido(3000)).toBe(18000);
  });
});
