import { describe, expect, it } from "vitest";
import { MES_REGEX, numeroDaParcela, somarMes } from "@/lib/parcelas";

describe("somarMes", () => {
  it("avança e volta meses, atravessando o ano", () => {
    expect(somarMes("2026-10", 1)).toBe("2026-11");
    expect(somarMes("2026-12", 1)).toBe("2027-01");
    expect(somarMes("2026-01", -1)).toBe("2025-12");
    expect(somarMes("2026-10", -3)).toBe("2026-07");
    expect(somarMes("2026-10", 0)).toBe("2026-10");
    expect(somarMes("2026-10", 27)).toBe("2029-01");
  });
});

describe("numeroDaParcela", () => {
  const compra = { mesInicio: "2026-07", totalParcelas: 6 };

  it("numera as parcelas do primeiro ao último mês", () => {
    expect(numeroDaParcela(compra, "2026-07")).toBe(1);
    expect(numeroDaParcela(compra, "2026-10")).toBe(4);
    expect(numeroDaParcela(compra, "2026-12")).toBe(6);
  });

  it("é nulo antes do início e depois do fim", () => {
    expect(numeroDaParcela(compra, "2026-06")).toBeNull();
    expect(numeroDaParcela(compra, "2027-01")).toBeNull();
  });

  it("funciona atravessando o ano", () => {
    const viagem = { mesInicio: "2026-11", totalParcelas: 4 };
    expect(numeroDaParcela(viagem, "2027-01")).toBe(3);
    expect(numeroDaParcela(viagem, "2027-02")).toBe(4);
    expect(numeroDaParcela(viagem, "2027-03")).toBeNull();
  });

  it("cadastrar a parcela 4/6 em outubro coloca o início em julho", () => {
    const inicio = somarMes("2026-10", -(4 - 1));
    expect(inicio).toBe("2026-07");
    expect(numeroDaParcela({ mesInicio: inicio, totalParcelas: 6 }, "2026-10")).toBe(4);
  });
});

describe("MES_REGEX", () => {
  it("aceita AAAA-MM válido e rejeita o resto", () => {
    expect(MES_REGEX.test("2026-10")).toBe(true);
    expect(MES_REGEX.test("2026-13")).toBe(false);
    expect(MES_REGEX.test("2026-00")).toBe(false);
    expect(MES_REGEX.test("26-10")).toBe(false);
    expect(MES_REGEX.test("2026-1")).toBe(false);
  });
});
