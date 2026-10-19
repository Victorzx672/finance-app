import { describe, expect, it } from "vitest";
import { montarPayloadMes, serializarMes, type DadosDoMes } from "@/lib/payload-mes";

const base: DadosDoMes = {
  mes: "2026-10",
  rendas: [{ nome: "Salário", valor: 4000 }],
  gastosFixos: 300,
  gastosVariaveis: 200,
  percentualInvestimento: 10,
  gastos: [{ nome: "Mercado", valor: 150, categoria: "Mercado", dia: 5 }],
};

describe("montarPayloadMes", () => {
  it("ignora linhas de renda em branco e dá nome padrão às sem nome", () => {
    const p = montarPayloadMes({
      ...base,
      rendas: [
        { nome: "Salário", valor: 4000 },
        { nome: "", valor: 0 },
        { nome: "   ", valor: 500 },
      ],
    });

    expect(p.rendas).toEqual([
      { nome: "Salário", valor: 4000 },
      { nome: "Renda", valor: 500 },
    ]);
  });

  it("campos opcionais ausentes viram null", () => {
    const p = montarPayloadMes({ ...base, gastos: [{ nome: "Água", valor: 30 }] });
    expect(p.gastos[0]).toEqual({ nome: "Água", valor: 30, cartao: null, categoria: null, pessoa: null, dia: null });
  });
});

describe("serializarMes (detecção de alterações não salvas)", () => {
  it("o mesmo conteúdo gera o mesmo texto, mesmo com ids e campos extras", () => {
    const carregado = serializarMes({
      ...base,
      gastos: [{ id: 99, financeId: 7, nome: "Mercado", valor: 150, categoria: "Mercado", dia: 5, cartao: null } as never],
    });
    const naTela = serializarMes(base);

    expect(carregado).toBe(naTela);
  });

  it("uma linha de renda em branco não conta como alteração", () => {
    const comLinhaVazia = serializarMes({ ...base, rendas: [...base.rendas, { nome: "", valor: 0 }] });
    expect(comLinhaVazia).toBe(serializarMes(base));
  });

  it("qualquer mudança real altera o texto", () => {
    const original = serializarMes(base);

    expect(serializarMes({ ...base, gastosFixos: 301 })).not.toBe(original);
    expect(serializarMes({ ...base, percentualInvestimento: 11 })).not.toBe(original);
    expect(serializarMes({ ...base, rendas: [{ nome: "Salário", valor: 4001 }] })).not.toBe(original);
    expect(serializarMes({ ...base, gastos: [] })).not.toBe(original);
    expect(serializarMes({ ...base, gastos: [{ ...base.gastos[0], valor: 151 }] })).not.toBe(original);
    expect(serializarMes({ ...base, gastos: [{ ...base.gastos[0], categoria: "Lazer" }] })).not.toBe(original);
  });

  it("mudar de mês também muda o texto", () => {
    expect(serializarMes({ ...base, mes: "2026-11" })).not.toBe(serializarMes(base));
  });
});
