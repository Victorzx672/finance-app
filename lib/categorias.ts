/** Categorias dos gastos detalhados. Para adicionar uma, inclua o nome aqui. */
export const CATEGORIAS = [
  "Moradia",
  "Mercado",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Compras",
  "Outros",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const categoriaValida = (v: unknown): v is Categoria =>
  typeof v === "string" && (CATEGORIAS as readonly string[]).includes(v);

/** Rótulo usado para gastos sem categoria nos resumos. */
export const SEM_CATEGORIA = "Sem categoria";
