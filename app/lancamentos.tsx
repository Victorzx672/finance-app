"use client";

import { useState } from "react";
import { FILTRO_VAZIO, type FiltroGastos } from "@/lib/filtro";
import { Dinheiro } from "./animacao";
import { IconeBusca, IconeCalendario, IconeCarteira } from "./icones";
import { SelectCategoria } from "./lista-gastos";

export type AbaLancamento = "contas" | "cartao" | "outros";

export interface ResumoAba {
  id: AbaLancamento;
  rotulo: string;
  quantidade: number;
  total: number;
}

const ICONE_ABA: Record<AbaLancamento, React.ReactNode> = {
  contas: <IconeCalendario size={17} />,
  // eslint-disable-next-line @next/next/no-img-element
  cartao: <img src="/nubank-card.png" alt="" width={26} height={17} className="lancamento-cartao" />,
  outros: <IconeCarteira size={17} />,
};

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
      <div className="panel-head lancamentos-cabeca">
        <h2 className="panel-title">Lançamentos do mês</h2>
        <p className="panel-sub">Contas fixas, compras no cartão e gastos avulsos.</p>
      </div>

      <div className="lancamentos-abas" role="tablist" aria-label="Lançamentos do mês">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={ativa === a.id}
            className={`lancamento-aba lancamento-aba--${a.id}`}
            onClick={() => setAtiva(a.id)}
          >
            <span className="lancamento-icone">{ICONE_ABA[a.id]}</span>
            <span className="lancamento-textos">
              <span className="lancamento-rotulo">
                {a.rotulo}
                <span className="lancamento-qtd">{a.quantidade}</span>
              </span>
              <span className="lancamento-total">
                <Dinheiro valor={a.total} />
              </span>
            </span>
          </button>
        ))}
      </div>

      {compras && temCompras && (
        <div className="filtro-barra">
          <div className="input-wrap input-wrap--busca">
            <span className="input-affix">
              <IconeBusca size={16} />
            </span>
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
            <button className="btn btn-ghost btn-sm" onClick={() => onFiltro(FILTRO_VAZIO)}>
              Limpar
            </button>
          )}
        </div>
      )}

      <div className="lancamentos-corpo" role="tabpanel" key={ativa}>
        {conteudo[ativa]}
      </div>
    </section>
  );
}
