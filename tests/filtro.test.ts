import { describe, expect, it } from "vitest";
import { FILTRO_VAZIO, filtroAtivo, filtrarGastos } from "@/lib/filtro";

const itens = [
  { nome: "Mercado do bairro", categoria: "Mercado" },
  { nome: "Cinema", categoria: "Lazer" },
  { nome: "Show de rock", categoria: "Lazer" },
  { nome: "Água", categoria: null },
];

describe("filtrarGastos", () => {
  it("sem filtro devolve tudo", () => {
    expect(filtrarGastos(itens, FILTRO_VAZIO)).toHaveLength(4);
    expect(filtroAtivo(FILTRO_VAZIO)).toBe(false);
  });

  it("busca pelo nome sem diferenciar maiúsculas nem acentos", () => {
    expect(filtrarGastos(itens, { texto: "MERCADO", categoria: "" }).map((i) => i.nome)).toEqual(["Mercado do bairro"]);
    expect(filtrarGastos(itens, { texto: "agua", categoria: "" }).map((i) => i.nome)).toEqual(["Água"]);
    expect(filtrarGastos(itens, { texto: "  show ", categoria: "" })).toHaveLength(1);
  });

  it("filtra por categoria, inclusive os sem categoria", () => {
    expect(filtrarGastos(itens, { texto: "", categoria: "Lazer" })).toHaveLength(2);
    expect(filtrarGastos(itens, { texto: "", categoria: "Sem categoria" }).map((i) => i.nome)).toEqual(["Água"]);
  });

  it("combina texto e categoria", () => {
    expect(filtrarGastos(itens, { texto: "show", categoria: "Lazer" })).toHaveLength(1);
    expect(filtrarGastos(itens, { texto: "show", categoria: "Mercado" })).toHaveLength(0);
    expect(filtroAtivo({ texto: "x", categoria: "" })).toBe(true);
  });
});
