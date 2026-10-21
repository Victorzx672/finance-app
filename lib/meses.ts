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
    .replace(/\.?\s+de\s+/, "/") // só o " de " separado: o "de" de "dez" fica
    .replace(".", "");

// ─── Seletor de mês e ano ─────────────────────────────────────────────────────

export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** "2026-10" -> 2026 */
export const anoDe = (chave: string) => Number(chave.slice(0, 4));

/** "2026-10" -> 10 (de 1 a 12) */
export const numeroDoMes = (chave: string) => Number(chave.slice(5, 7));

/** (2026, 10) -> "2026-10" */
export const montarMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}`;

/** Anos que o seletor oferece: 5 para trás e 2 para frente (e antes disso, se houver dados). */
export function faixaDeAnos(anoAtual: number, mesesComDados: Iterable<string> = []) {
  let min = anoAtual - 5;

  for (const m of mesesComDados) min = Math.min(min, anoDe(m));

  return { min, max: anoAtual + 2 };
}
