"use client";

import { useState } from "react";
import { FILTRO_VAZIO, type FiltroGastos } from "@/lib/filtro";
import { SelectCategoria } from "./lista-gastos";
import { fmt } from "./ui";

export type AbaLancamento = "contas" | "cartao" | "outros";

export interface ResumoAba {
  id: AbaLancamento;
  rotulo: string;
  quantidade: number;
  total: number;
  /** pontinho colorido ao lado do nome da aba */
  cor?: string;
}

/**
 * Tudo que se lança no mês em um só cartão com abas (contas fixas, cartão, avulsos),
 * em vez de três listas compridas uma embaixo da outra. A busca vale para as compras.
 */
export function Lancamentos({
  abas,
  filtro,
  onFiltro,
  conteudo,
}: {
  abas: ResumoAba[];
  filtro: FiltroGastos;
  onFiltro: (f: FiltroGastos) => void;
  conteudo: Record<AbaLancamento, React.ReactNode>;
}) {
  const [ativa, setAtiva] = useState<AbaLancamento>("cartao");

  const compras = ativa !== "contas";
  const temCompras = abas.some((a) => a.id !== "contas" && a.quantidade > 0);

  return (
    <section className="card lancamentos">
      <div className="lancamentos-abas" role="tablist" aria-label="Lançamentos do mês">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={ativa === a.id}
            className="lancamento-aba"
            onClick={() => setAtiva(a.id)}
          >
            <span className="lancamento-rotulo">
              {a.cor && <span className="chip-cat-dot" style={{ background: a.cor }} />}
              {a.rotulo}
              <span className="lancamento-qtd">{a.quantidade}</span>
            </span>
            <span className="lancamento-total">{fmt(a.total)}</span>
          </button>
        ))}
      </div>

      {compras && temCompras && (
        <div className="filtro-barra">
          <div className="input-wrap">
            <input
              type="search"
              placeholder="Buscar compra pelo nome"
              aria-label="Buscar compra"
              value={filtro.texto}
              onChange={(e) => onFiltro({ ...filtro, texto: e.target.value })}
            />
          </div>

          <SelectCategoria
            value={filtro.categoria}
            onChange={(v) => onFiltro({ ...filtro, categoria: v })}
            rotulo="Filtrar por categoria"
            vazio="Todas as categorias"
          />

          {(filtro.texto || filtro.categoria) && (
            <button className="btn btn-outline btn-sm" onClick={() => onFiltro(FILTRO_VAZIO)}>
              Limpar
            </button>
          )}
        </div>
      )}

      <div className="lancamentos-corpo" role="tabpanel">
        {conteudo[ativa]}
      </div>
    </section>
  );
}
