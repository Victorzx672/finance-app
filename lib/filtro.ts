import { SEM_CATEGORIA } from "@/lib/categorias";

export interface FiltroGastos {
  /** parte do nome, sem diferenciar maiúsculas nem acentos */
  texto: string;
  /** nome de uma categoria, SEM_CATEGORIA, ou "" para todas */
  categoria: string;
}

export const FILTRO_VAZIO: FiltroGastos = { texto: "", categoria: "" };

export const filtroAtivo = (f: FiltroGastos) => f.texto.trim() !== "" || f.categoria !== "";

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function filtrarGastos<T extends { nome: string; categoria?: string | null }>(
  itens: T[],
  filtro: FiltroGastos
) {
  const busca = normalizar(filtro.texto.trim());

  return itens.filter((i) => {
    if (busca && !normalizar(i.nome).includes(busca)) return false;
    if (filtro.categoria && (i.categoria ?? SEM_CATEGORIA) !== filtro.categoria) return false;
    return true;
  });
}
