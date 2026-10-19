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

const CORES_CATEGORIAS = ["#0891b2", "#4d7c0f", "#2563eb", "#dc2626", "#7c3aed", "#db2777", "#d97706", "#0f766e", "#64748b"];

/** Cor fixa de cada categoria (a mesma em todas as listas). */
export const corDaCategoria = (categoria: string) => {
  const i = (CATEGORIAS as readonly string[]).indexOf(categoria);
  return CORES_CATEGORIAS[i >= 0 ? i : CORES_CATEGORIAS.length - 1];
};

/** Rótulo usado para gastos sem categoria nos resumos. */
export const SEM_CATEGORIA = "Sem categoria";
