import { describe, expect, it } from "vitest";
import { cartaoValido } from "@/lib/cartoes";
import { categoriaValida } from "@/lib/categorias";
import {
  MESES_CURTOS,
  anoDe,
  chaveMes,
  faixaDeAnos,
  labelCurto,
  labelMes,
  montarMes,
  numeroDoMes,
} from "@/lib/meses";
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

  it("separa e monta ano e mês", () => {
    expect(anoDe("2026-10")).toBe(2026);
    expect(numeroDoMes("2026-10")).toBe(10);
    expect(numeroDoMes("2026-03")).toBe(3);
    expect(montarMes(2026, 3)).toBe("2026-03");
    expect(montarMes(2027, 12)).toBe("2027-12");
    expect(chaveMes(new Date(2026, 9, 17))).toBe("2026-10");
    expect(MESES_CURTOS).toHaveLength(12);
  });

  it("a faixa de anos vai de 5 atrás a 2 à frente, e cresce para trás se houver dados antigos", () => {
    expect(faixaDeAnos(2026)).toEqual({ min: 2021, max: 2028 });
    expect(faixaDeAnos(2026, ["2025-04", "2026-01"])).toEqual({ min: 2021, max: 2028 });
    expect(faixaDeAnos(2026, ["2018-11"])).toEqual({ min: 2018, max: 2028 });
  });
});
