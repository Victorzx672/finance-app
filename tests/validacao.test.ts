import { describe, expect, it } from "vitest";
import { cartaoValido } from "@/lib/cartoes";
import { categoriaValida } from "@/lib/categorias";
import { chaveMes, labelCurto, labelMes, listaMeses, MESES_ADIANTE, MESES_ATRAS } from "@/lib/meses";
import { emailValido, normalizarEmail, senhaValida, usuarioValido } from "@/lib/validacao";

describe("usuário, e-mail e senha", () => {
  it("usuário não pode ter @ nem espaços e tem de 3 a 30 caracteres", () => {
    expect(usuarioValido("joao.victor_12")).toBe(true);
    expect(usuarioValido("a@b.com")).toBe(false);
    expect(usuarioValido("com espaço")).toBe(false);
    expect(usuarioValido("ab")).toBe(false);
    expect(usuarioValido("a".repeat(31))).toBe(false);
  });

  it("valida e normaliza e-mail", () => {
    expect(normalizarEmail("  Fulano@Exemplo.COM ")).toBe("fulano@exemplo.com");
    expect(emailValido("fulano@exemplo.com")).toBe(true);
    expect(emailValido("fulano@exemplo")).toBe(false);
    expect(emailValido("fulano exemplo.com")).toBe(false);
    expect(normalizarEmail(123)).toBe("");
  });

  it("senha precisa de 8 a 72 caracteres", () => {
    expect(senhaValida("12345678")).toBe(true);
    expect(senhaValida("1234567")).toBe(false);
    expect(senhaValida("a".repeat(73))).toBe(false);
    expect(senhaValida(12345678)).toBe(false);
  });
});

describe("listas fixas", () => {
  it("só aceita cartões e categorias conhecidos", () => {
    expect(cartaoValido("Nubank")).toBe(true);
    expect(cartaoValido("Inter")).toBe(false);
    expect(categoriaValida("Mercado")).toBe(true);
    expect(categoriaValida("Saúde")).toBe(true);
    expect(categoriaValida("Educação")).toBe(true);
    expect(categoriaValida("Inventada")).toBe(false);
  });
});

describe("meses", () => {
  it("formata rótulos em português", () => {
    expect(labelMes("2026-10")).toBe("Outubro de 2026");
    expect(labelMes("2027-03")).toBe("Março de 2027");
    expect(labelCurto("2026-10")).toBe("out/26");
  });

  it("a lista de meses inclui o atual, com o intervalo esperado", () => {
    const base = new Date(2026, 9, 17);
    const lista = listaMeses(base);

    expect(lista).toHaveLength(MESES_ATRAS + MESES_ADIANTE + 1);
    expect(lista[0].value).toBe("2023-10");
    expect(lista[MESES_ATRAS].value).toBe(chaveMes(base));
    expect(lista[lista.length - 1].value).toBe("2027-10");
  });
});
