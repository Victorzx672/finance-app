import { describe, expect, it } from "vitest";
import { nomesConhecidos, sugerirPeloNome } from "@/lib/sugestao";

const historico = [
  { nome: "Posto Shell", categoria: "Transporte", pessoa: "Beto" },
  { nome: "Padaria do Zé", categoria: "Mercado", pessoa: null },
  { nome: "Loja da esquina", categoria: "Lazer", pessoa: "Ana" },
  { nome: "Posto Shell", categoria: "Transporte", pessoa: "Ana" },
];

describe("sugerirPeloNome", () => {
  it("usa a categoria que já foi usada para o mesmo nome", () => {
    // "loja" sozinha cairia em Compras pelas palavras-chave; o que o usuário usou vale mais
    expect(sugerirPeloNome("loja da esquina", historico).categoria).toBe("Lazer");
  });

  it("sem histórico, sugere pelas palavras-chave", () => {
    expect(sugerirPeloNome("iFood", []).categoria).toBe("Mercado");
    expect(sugerirPeloNome("Uber", []).categoria).toBe("Transporte");
    expect(sugerirPeloNome("Uber Eats", []).categoria).toBe("Mercado");
  });

  it("a pessoa vem da última compra com o mesmo nome", () => {
    expect(sugerirPeloNome("posto shell", historico).pessoa).toBe("Ana");
    expect(sugerirPeloNome("Padaria do Zé", historico).pessoa).toBeNull();
  });

  it("nome vazio ou sem pista não sugere nada", () => {
    expect(sugerirPeloNome("  ", historico)).toEqual({ categoria: null, pessoa: null });
    expect(sugerirPeloNome("xyz", []).categoria).toBeNull();
  });
});

describe("nomesConhecidos", () => {
  it("lista os nomes sem repetir, os mais recentes primeiro", () => {
    expect(nomesConhecidos(historico)).toEqual(["Posto Shell", "Loja da esquina", "Padaria do Zé"]);
  });

  it("respeita o máximo", () => {
    expect(nomesConhecidos(historico, 2)).toHaveLength(2);
  });
});
