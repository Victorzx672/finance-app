// Pequenos auxiliares das rotas da API.

export const erro = (mensagem: string, status = 400) =>
  Response.json({ error: mensagem }, { status });

export const naoAutorizado = () => erro("Não autorizado", 401);

export async function lerJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const corpo = await req.json();
    return corpo && typeof corpo === "object" && !Array.isArray(corpo) ? corpo : null;
  } catch {
    return null;
  }
}

export const inteiroEntre = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export const textoValido = (v: unknown, max = 80): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

/** Valor em reais maior que zero. */
export const valorPositivo = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1e9;

/** Valor em reais, zero ou mais. */
export const valorNaoNegativo = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e12;
