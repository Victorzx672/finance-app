import { somarMes } from "@/lib/parcelas";

export const chaveMes = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const dataDoMes = (chave: string) => {
  const [ano, mes] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, 1);
};

/** "2026-10" -> "Outubro de 2026" */
export const labelMes = (chave: string) =>
  maiuscula(dataDoMes(chave).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));

/** "2026-10" -> "out/26" */
export const labelCurto = (chave: string) =>
  dataDoMes(chave)
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(/\.?\s*de\s*/, "/")
    .replace(".", "");

export const MESES_ATRAS = 36;
export const MESES_ADIANTE = 12;

/** Opções do seletor de mês: de MESES_ATRAS atrás até MESES_ADIANTE à frente. */
export function listaMeses(base = new Date()) {
  const atual = chaveMes(base);

  return Array.from({ length: MESES_ATRAS + MESES_ADIANTE + 1 }, (_, i) => {
    const chave = somarMes(atual, i - MESES_ATRAS);
    return { value: chave, label: labelMes(chave) };
  });
}
