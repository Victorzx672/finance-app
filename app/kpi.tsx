"use client";

import { Dinheiro } from "./animacao";

export type CorKpi = "green" | "red" | "blue" | "amber" | "purple" | "teal";

/** Cartão de resumo: ícone, rótulo, valor (com contagem animada), detalhe e, se houver, uma barra. */
export function Kpi({
  rotulo,
  valor,
  cor,
  icone,
  sub,
  progresso,
  acao,
}: {
  rotulo: string;
  /** número = reais (animado); texto = mostrado como está */
  valor: number | string;
  cor: CorKpi;
  icone: React.ReactNode;
  sub: React.ReactNode;
  /** 0 a 100: barra fininha embaixo do valor */
  progresso?: number;
  /** botão ou aviso extra no rodapé do cartão */
  acao?: React.ReactNode;
}) {
  return (
    <div className={`card kpi kpi--${cor}`}>
      <div className="kpi-topo">
        <span className="kpi-icone">{icone}</span>
        <span className="kpi-rotulo" title={rotulo}>
          {rotulo}
        </span>
      </div>

      <span className="kpi-valor">{typeof valor === "number" ? <Dinheiro valor={valor} /> : valor}</span>

      {progresso !== undefined && (
        <div className="kpi-barra" aria-hidden="true">
          <div style={{ width: `${Math.max(0, Math.min(100, progresso))}%` }} />
        </div>
      )}

      <span className="kpi-sub">{sub}</span>
      {acao && <div className="kpi-acao">{acao}</div>}
    </div>
  );
}
