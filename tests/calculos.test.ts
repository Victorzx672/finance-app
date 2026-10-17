import { describe, expect, it } from "vitest";
import {
  arredondar,
  calcularResumo,
  limiteDeGastos,
  mesesAteMeta,
  passouDoLimite,
  serieProjecao,
  somar,
  valorFuturo,
} from "@/lib/calculos";

const base = {
  renda: 5000,
  gastosFixos: 1000,
  gastosVariaveis: 500,
  gastosDetalhados: 200,
  percentualInvestimento: 10,
  meta: 0,
};

describe("arredondar", () => {
  it("elimina sobras de ponto flutuante", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(arredondar(0.1 + 0.2)).toBe(0.3);
    expect(arredondar(3040.1000000000004)).toBe(3040.1);
  });
});

describe("somar", () => {
  it("soma as fontes de renda em centavos", () => {
    expect(somar([{ valor: 3500.5 }, { valor: 1200.25 }])).toBe(4700.75);
    expect(somar([{ valor: 0.1 }, { valor: 0.2 }])).toBe(0.3);
    expect(somar([])).toBe(0);
  });
});

describe("calcularResumo", () => {
  it("calcula saldo, investimento e valor livre", () => {
    const r = calcularResumo(base);

    expect(r.totalGastos).toBe(1700);
    expect(r.saldo).toBe(3300);
    expect(r.investimento).toBe(330);
    expect(r.livre).toBe(2970);
    expect(r.percentGastos).toBeCloseTo(34);
  });

  it("não investe quando o saldo é negativo", () => {
    const r = calcularResumo({ ...base, renda: 1000 });

    expect(r.saldo).toBe(-700);
    expect(r.investimento).toBe(0);
    expect(r.livre).toBe(-700);
  });

  it("limita a barra de gastos a 100%", () => {
    expect(calcularResumo({ ...base, renda: 1000 }).percentGastos).toBe(100);
  });

  it("sem renda mas com gastos, considera 100%; sem nada, 0%", () => {
    expect(calcularResumo({ ...base, renda: 0 }).percentGastos).toBe(100);
    expect(
      calcularResumo({ ...base, renda: 0, gastosFixos: 0, gastosVariaveis: 0, gastosDetalhados: 0 })
        .percentGastos
    ).toBe(0);
  });

  it("soma centavos sem erro de arredondamento", () => {
    const r = calcularResumo({ ...base, gastosFixos: 0.1, gastosVariaveis: 0.2, gastosDetalhados: 0 });
    expect(r.totalGastos).toBe(0.3);
  });
});

describe("limite de gastos (60% da renda)", () => {
  // renda 5000 => limite 3000; "atenção" a partir de 2400 (80% do limite)
  const com = (gastosDetalhados: number) =>
    calcularResumo({ ...base, gastosFixos: 0, gastosVariaveis: 0, gastosDetalhados });

  it("calcula o limite e a folga", () => {
    const r = com(1000);
    expect(r.limiteGastos).toBe(3000);
    expect(r.folgaLimite).toBe(2000);
    expect(r.statusLimite).toBe("ok");
  });

  it("avisa quando está chegando perto do limite", () => {
    expect(com(2399.99).statusLimite).toBe("ok");
    expect(com(2400).statusLimite).toBe("atencao");
    expect(com(2999).statusLimite).toBe("atencao");
  });

  it("gastar exatamente o limite ainda não excede", () => {
    const r = com(3000);
    expect(r.statusLimite).toBe("atencao");
    expect(r.folgaLimite).toBe(0);
    expect(passouDoLimite(5000, 3000)).toBe(false);
  });

  it("passou do limite a partir de um centavo acima", () => {
    const r = com(3000.01);
    expect(r.statusLimite).toBe("excedido");
    expect(r.folgaLimite).toBe(-0.01);
    expect(passouDoLimite(5000, 3000.01)).toBe(true);
  });

  it("sem renda não há limite a comparar", () => {
    expect(calcularResumo({ ...base, renda: 0 }).statusLimite).toBe("sem-renda");
    expect(passouDoLimite(0, 100)).toBe(false);
    expect(limiteDeGastos(-10)).toBe(0);
  });

  it("o limite acompanha a soma de todas as fontes de renda", () => {
    expect(limiteDeGastos(somar([{ valor: 3500.5 }, { valor: 1200.25 }]))).toBe(2820.45);
  });
});

describe("meta com juros", () => {
  it("o prazo é o menor número de meses que alcança a meta", () => {
    const aporte = 330;
    const meta = 10000;
    const n = mesesAteMeta(aporte, meta);

    expect(valorFuturo(aporte, n)).toBeGreaterThanOrEqual(meta);
    expect(valorFuturo(aporte, n - 1)).toBeLessThan(meta);
  });

  it("com juros chega antes do que a divisão simples", () => {
    expect(mesesAteMeta(500, 12000)).toBeLessThan(Math.ceil(12000 / 500));
  });

  it("devolve 0 sem aporte ou sem meta", () => {
    expect(mesesAteMeta(0, 1000)).toBe(0);
    expect(mesesAteMeta(100, 0)).toBe(0);
  });
});

describe("serieProjecao", () => {
  it("mostra pelo menos 12 meses", () => {
    expect(serieProjecao(1000, 0)).toHaveLength(12);
  });

  it("estende até a meta, com teto de 60 meses", () => {
    const n = mesesAteMeta(300, 10000);
    expect(serieProjecao(300, 10000)).toHaveLength(Math.max(12, n));
    expect(serieProjecao(10, 1_000_000)).toHaveLength(60);
  });

  it("é crescente", () => {
    const s = serieProjecao(300, 0);
    expect(s[11].valor).toBeGreaterThan(s[0].valor);
  });
});
