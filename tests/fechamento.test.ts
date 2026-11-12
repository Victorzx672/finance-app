import { describe, expect, it } from "vitest";
import {
  mesAnteriorAberto,
  mesEmAndamento,
  pendenciasDoFechamento,
  devePrepararProximo,
  prepararProximoMes,
  quantasPendencias,
  situacaoDoMes,
  temAlgoParaCopiar,
} from "@/lib/fechamento";

const conj = (...meses: string[]) => new Set(meses);

describe("mesEmAndamento", () => {
  it("é o mês do calendário quando ele ainda está aberto", () => {
    expect(mesEmAndamento("2026-11", conj())).toBe("2026-11");
    expect(mesEmAndamento("2026-11", conj("2026-10"))).toBe("2026-11");
  });

  it("pula para o seguinte quando o mês do calendário já foi concluído", () => {
    expect(mesEmAndamento("2026-11", conj("2026-11"))).toBe("2026-12");
  });

  it("atravessa a virada do ano e meses concluídos em sequência", () => {
    expect(mesEmAndamento("2026-11", conj("2026-11", "2026-12"))).toBe("2027-01");
  });
});

describe("mesAnteriorAberto", () => {
  it("lembra do mês anterior salvo e ainda aberto", () => {
    expect(mesAnteriorAberto("2026-11", conj("2026-10", "2026-11"), conj())).toBe("2026-10");
  });

  it("não lembra se o anterior já foi concluído ou nem tem dados", () => {
    expect(mesAnteriorAberto("2026-11", conj("2026-10"), conj("2026-10"))).toBeNull();
    expect(mesAnteriorAberto("2026-11", conj("2026-09"), conj())).toBeNull();
  });

  it("olha só o mês logo antes (meses antigos não ficam cobrando)", () => {
    expect(mesAnteriorAberto("2026-12", conj("2026-10"), conj())).toBeNull();
  });
});

describe("situacaoDoMes", () => {
  const base = { hoje: "2026-11", emAndamento: "2026-11", concluido: false, diaHoje: 11 };

  it("conta os dias que faltam no mês do calendário", () => {
    expect(situacaoDoMes({ ...base, mes: "2026-11" })).toEqual({ tipo: "andamento", diasRestantes: 20 });
  });

  it("o último dia conta como 1 dia restante", () => {
    expect(situacaoDoMes({ ...base, mes: "2026-11", diaHoje: 30 })).toEqual({ tipo: "andamento", diasRestantes: 1 });
  });

  it("mês em andamento à frente do calendário não tem contagem de dias", () => {
    expect(
      situacaoDoMes({ ...base, mes: "2026-12", emAndamento: "2026-12" })
    ).toEqual({ tipo: "andamento", diasRestantes: null });
  });

  it("concluído vale mais que qualquer outra situação", () => {
    expect(situacaoDoMes({ ...base, mes: "2026-10", concluido: true }).tipo).toBe("concluido");
  });

  it("mês que já passou e ficou aberto terminou; depois do em andamento é futuro", () => {
    expect(situacaoDoMes({ ...base, mes: "2026-10" })).toEqual({ tipo: "terminou", recente: true });
    expect(situacaoDoMes({ ...base, mes: "2027-01" }).tipo).toBe("futuro");
  });
});

describe("situacaoDoMes em meses antigos", () => {
  it("só o mês logo antes do em andamento é recente (os mais antigos não ficam cobrando)", () => {
    const base = { hoje: "2026-11", emAndamento: "2026-11", concluido: false, diaHoje: 11 };
    expect(situacaoDoMes({ ...base, mes: "2026-06" })).toEqual({ tipo: "terminou", recente: false });
  });
});

describe("devePrepararProximo", () => {
  it("prepara o mês seguinte só se ele é o de hoje ou depois", () => {
    expect(devePrepararProximo("2026-12", "2026-11")).toBe(true);
    expect(devePrepararProximo("2026-11", "2026-11")).toBe(true);
  });

  it("concluir um mês antigo não inventa dados para o mês seguinte, que também já passou", () => {
    expect(devePrepararProximo("2026-07", "2026-11")).toBe(false);
  });
});

describe("pendenciasDoFechamento", () => {
  const tudoCerto = {
    alterado: false,
    renda: 3000,
    contasPendentes: [],
    fatura: 0,
    faturaPaga: true,
    investimento: 200,
    investimentoGuardado: 200,
  };

  it("sem nada pendente", () => {
    const p = pendenciasDoFechamento(tudoCerto);

    expect(p).toEqual({
      salvar: false,
      semRenda: false,
      contas: { quantidade: 0, total: 0 },
      fatura: 0,
      investir: 0,
    });
    expect(quantasPendencias(p)).toBe(0);
  });

  it("junta contas não pagas, fatura em aberto, sobra não guardada e alterações", () => {
    const p = pendenciasDoFechamento({
      ...tudoCerto,
      alterado: true,
      contasPendentes: [{ valor: 120.5 }, { valor: 80 }],
      fatura: 950.1,
      faturaPaga: false,
      investimentoGuardado: 50,
    });

    expect(p.salvar).toBe(true);
    expect(p.contas).toEqual({ quantidade: 2, total: 200.5 });
    expect(p.fatura).toBe(950.1);
    expect(p.investir).toBe(150);
    expect(quantasPendencias(p)).toBe(4);
  });

  it("fatura zerada não é pendência, nem guardar mais do que havia para investir", () => {
    const p = pendenciasDoFechamento({ ...tudoCerto, fatura: 0, faturaPaga: false, investimentoGuardado: 500 });

    expect(p.fatura).toBe(0);
    expect(p.investir).toBe(0);
  });

  it("mês sem renda é avisado", () => {
    const p = pendenciasDoFechamento({ ...tudoCerto, renda: 0, investimento: 0, investimentoGuardado: 0 });

    expect(p.semRenda).toBe(true);
    expect(quantasPendencias(p)).toBe(1);
  });
});

describe("prepararProximoMes", () => {
  const outubro = {
    renda: 3200,
    gastosFixos: 150,
    gastosVariaveis: 900,
    percentualInvestimento: 20,
    rendas: [
      { nome: "Salário", valor: 3000 },
      { nome: "Freela", valor: 200 },
    ],
  };

  it("leva o que se repete: estimativas, % para investir e as fontes de renda", () => {
    expect(prepararProximoMes(outubro, false)).toEqual({
      rendas: outubro.rendas,
      gastosFixos: 150,
      gastosVariaveis: 900,
      percentualInvestimento: 20,
    });
  });

  it("com renda fixa no mês seguinte não copia as fontes (contaria o salário duas vezes)", () => {
    expect(prepararProximoMes(outubro, true).rendas).toEqual([]);
  });

  it("mês antigo sem fontes vira uma fonte só com o total", () => {
    expect(prepararProximoMes({ ...outubro, rendas: [] }, false).rendas).toEqual([{ nome: "Renda", valor: 3200 }]);
  });

  it("não copia fonte de renda em branco ou zerada", () => {
    const comVazias = { ...outubro, rendas: [...outubro.rendas, { nome: "", valor: 0 }, { nome: "Bico", valor: 0 }] };
    expect(prepararProximoMes(comVazias, false).rendas).toEqual(outubro.rendas);
  });

  it("renda zerada não cria fonte vazia", () => {
    expect(prepararProximoMes({ ...outubro, renda: 0, rendas: [] }, false).rendas).toEqual([]);
  });

  it("mês todo zerado não tem o que copiar", () => {
    const vazio = { renda: 0, gastosFixos: 0, gastosVariaveis: 0, percentualInvestimento: 0, rendas: [] };

    expect(temAlgoParaCopiar(prepararProximoMes(vazio, false))).toBe(false);
    expect(temAlgoParaCopiar(prepararProximoMes({ ...vazio, percentualInvestimento: 10 }, true))).toBe(true);
  });
});
