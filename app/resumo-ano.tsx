"use client";

import { useState } from "react";
import { LIMITE_GASTOS_PERCENT, passouDoLimite } from "@/lib/calculos";
import { anosDisponiveis, resumoDoAno } from "@/lib/ano";
import { labelMes } from "@/lib/meses";
import type { HistoricoMes } from "./dados";
import { fmt } from "./ui";

/** Visão do ano: totais, média mensal, mês mais caro e quantos meses passaram do limite. */
export function PainelAno({ historico, anoAtual }: { historico: HistoricoMes[]; anoAtual: number }) {
  const [ano, setAno] = useState(anoAtual);

  const anos = anosDisponiveis(historico, anoAtual);
  const r = resumoDoAno(historico, ano);
  const maior = Math.max(...r.meses.map((m) => Math.max(m.renda, m.totalGastos)), 1);

  return (
    <div className="ano-layout">
      <section className="card month-bar">
        <div className="month-picker">
          <span className="month-label">Ano</span>
          <select className="month-select" value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano">
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <p className="ano-nota">
          Considera só os meses salvos ({r.meses.length} {r.meses.length === 1 ? "mês" : "meses"}).
        </p>
      </section>

      {r.meses.length === 0 ? (
        <section className="card">
          <div className="empty-state">Nenhum mês salvo em {ano}.</div>
        </section>
      ) : (
        <>
          <div className="cards-grid">
            <div className="card summary-card summary-card--blue">
              <span className="summary-label">Renda do ano</span>
              <span className="summary-value">{fmt(r.rendaTotal)}</span>
              <span className="summary-sub">Soma dos meses salvos</span>
            </div>

            <div className="card summary-card summary-card--amber">
              <span className="summary-label">Gastos do ano</span>
              <span className="summary-value">{fmt(r.gastosTotal)}</span>
              <span className="summary-sub">
                {r.percentualMedio.toFixed(0)}% da renda, média de {fmt(r.mediaGastos)} por mês
              </span>
            </div>

            <div className={`card summary-card summary-card--${r.saldoTotal >= 0 ? "green" : "red"}`}>
              <span className="summary-label">Sobrou no ano</span>
              <span className="summary-value">{fmt(r.saldoTotal)}</span>
              <span className="summary-sub">Renda menos todos os gastos</span>
            </div>

            <div className="card summary-card summary-card--purple">
              <span className="summary-label">Mês mais caro</span>
              <span className="summary-value">{r.mesMaisCaro ? fmt(r.mesMaisCaro.totalGastos) : "—"}</span>
              <span className="summary-sub">{r.mesMaisCaro ? labelMes(r.mesMaisCaro.mesReferencia) : ""}</span>
            </div>

            <div className={`card summary-card summary-card--${r.mesesAcimaDoLimite > 0 ? "red" : "green"}`}>
              <span className="summary-label">Acima de {LIMITE_GASTOS_PERCENT}% da renda</span>
              <span className="summary-value">
                {r.mesesAcimaDoLimite} de {r.meses.length}
              </span>
              <span className="summary-sub">
                {r.mesesAcimaDoLimite === 0 ? "Nenhum mês passou do limite" : "meses que passaram do limite"}
              </span>
            </div>
          </div>

          <section className="card">
            <div className="panel-head">
              <h2 className="panel-title">Mês a mês em {ano}</h2>
              <p className="panel-sub">Renda (azul) e gastos (laranja) de cada mês.</p>
            </div>

            <ul className="ano-lista">
              {r.meses.map((m) => (
                <li key={m.mesReferencia} className="ano-linha">
                  <span className="ano-mes">{labelMes(m.mesReferencia).replace(` de ${ano}`, "")}</span>

                  <div className="ano-barras">
                    <div className="ano-barra ano-barra--renda" style={{ width: `${(m.renda / maior) * 100}%` }} />
                    <div
                      className={`ano-barra ano-barra--gasto ${passouDoLimite(m.renda, m.totalGastos) ? "ano-barra--alerta" : ""}`}
                      style={{ width: `${(m.totalGastos / maior) * 100}%` }}
                    />
                  </div>

                  <span className="ano-valores">
                    <b>{fmt(m.saldo)}</b>
                    <small>
                      gastou {fmt(m.totalGastos)}
                      {passouDoLimite(m.renda, m.totalGastos) && <span className="history-flag">acima de {LIMITE_GASTOS_PERCENT}%</span>}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
