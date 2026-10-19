import { describe, expect, it } from "vitest";
import { CATEGORIAS, corDaCategoria } from "@/lib/categorias";
import { aplicarAporte, totalGuardado } from "@/lib/metas";
import { rendaDoMes, resumoDoMes, type MesSalvo } from "@/lib/resumo-mes";

const mes = (parte: Partial<MesSalvo> = {}): MesSalvo => ({
  mesReferencia: "2026-11",
  renda: 0,
  gastosFixos: 0,
  gastosVariaveis: 0,
  percentualInvestimento: 0,
  gastos: [],
  ...parte,
});

const salario = { valor: 3100, mesInicio: "2026-10", mesFim: null };
const outro = { valor: 2650, mesInicio: "2026-10", mesFim: null };

describe("rendaDoMes (rendas fixas + extras do mês)", () => {
  it("soma as rendas fixas que valem no mês com as extras salvas", () => {
    expect(rendaDoMes(mes({ renda: 500 }), [salario, outro])).toBe(6250);
  });

  it("um mês sem nada salvo já tem a renda fixa", () => {
    expect(rendaDoMes(mes(), [salario])).toBe(3100);
  });

  it("não conta renda que ainda não começou nem a que já terminou", () => {
    const futura = { valor: 1000, mesInicio: "2026-12", mesFim: null };
    const encerrada = { valor: 800, mesInicio: "2026-01", mesFim: "2026-10" };

    expect(rendaDoMes(mes(), [salario, futura, encerrada])).toBe(3100);
  });

  it("nova versão a partir de um mês não altera o passado", () => {
    const antiga = { valor: 3000, mesInicio: "2026-01", mesFim: "2026-10" };
    const nova = { valor: 3300, mesInicio: "2026-11", mesFim: null };

    expect(rendaDoMes(mes({ mesReferencia: "2026-10" }), [antiga, nova])).toBe(3000);
    expect(rendaDoMes(mes({ mesReferencia: "2026-11" }), [antiga, nova])).toBe(3300);
  });
});

describe("resumoDoMes com rendas fixas", () => {
  it("usa a renda total (fixas + extras) no saldo e no limite de gastos", () => {
    const r = resumoDoMes(mes({ renda: 400, gastosVariaveis: 1000 }), [], [], [salario, outro]);

    expect(r.renda).toBe(6150);
    expect(r.saldo).toBe(5150);
    expect(r.limiteGastos).toBeCloseTo(6150 * 0.6, 2);
  });

  it("sem rendas fixas se comporta como antes", () => {
    const r = resumoDoMes(mes({ renda: 2000, gastosVariaveis: 500 }), [], []);

    expect(r.renda).toBe(2000);
    expect(r.saldo).toBe(1500);
  });
});

describe("total guardado", () => {
  it("soma o dinheiro sem meta com o que está nas metas", () => {
    expect(totalGuardado([{ guardado: 700 }, { guardado: 300.5 }], 12000)).toBe(13000.5);
  });

  it("sem metas, é só o guardado geral", () => {
    expect(totalGuardado([], 250)).toBe(250);
  });

  it("guardar soma e retirar subtrai, sem ficar negativo", () => {
    expect(aplicarAporte(1000, 250.1)).toBe(1250.1);
    expect(aplicarAporte(1000, -400)).toBe(600);
    expect(aplicarAporte(100, -500)).toBe(0);
  });
});

describe("corDaCategoria", () => {
  it("cada categoria tem sempre a mesma cor, e uma desconhecida usa a cor neutra", () => {
    expect(corDaCategoria(CATEGORIAS[0])).toBe(corDaCategoria(CATEGORIAS[0]));
    expect(corDaCategoria(CATEGORIAS[0])).not.toBe(corDaCategoria(CATEGORIAS[1]));
    expect(corDaCategoria("Inexistente")).toBe(corDaCategoria("Outros"));
  });
});
