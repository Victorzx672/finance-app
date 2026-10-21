"use client";

import { useState } from "react";
import { LIMITE_GASTOS_PERCENT, passouDoLimite } from "@/lib/calculos";
import { anosDisponiveis, resumoDoAno } from "@/lib/ano";
import { labelMes } from "@/lib/meses";
import type { HistoricoMes } from "./dados";
import { IconeAlerta, IconeCalendario, IconeCarteira, IconeTendencia } from "./icones";
import { Kpi } from "./kpi";
import { Vazio, fmt } from "./ui";

/** Visão do ano: totais, média mensal, mês mais caro e quantos meses passaram do limite. */
export function PainelAno({ historico, anoAtual }: { historico: HistoricoMes[]; anoAtual: number }) {
  const [ano, setAno] = useState(anoAtual);

  const anos = anosDisponiveis(historico, anoAtual);
  const r = resumoDoAno(historico, ano);
  const maior = Math.max(...r.meses.map((m) => Math.max(m.renda, m.totalGastos)), 1);

  return (
    <div className="ano-layout">
      <section className="ano-barra-topo">
        <div className="segmentos segmentos--compacto" role="radiogroup" aria-label="Ano">
          {anos.map((a) => (
            <button key={a} role="radio" aria-checked={ano === a} className="segmento" onClick={() => setAno(a)}>
              {a}
            </button>
          ))}
        </div>

        <p className="ano-nota">
          Considera só os meses salvos ({r.meses.length} {r.meses.length === 1 ? "mês" : "meses"}).
        </p>
      </section>

      {r.meses.length === 0 ? (
        <section className="card">
          <Vazio texto={`Nenhum mês salvo em ${ano}.`} />
        </section>
      ) : (
        <>
          <div className="cards-grid">
            <Kpi
              rotulo="Renda do ano"
              valor={r.rendaTotal}
              cor="blue"
              icone={<IconeTendencia size={19} />}
              sub="Soma dos meses salvos"
            />

            <Kpi
              rotulo="Gastos do ano"
              valor={r.gastosTotal}
              cor="amber"
              icone={<IconeCarteira size={19} />}
              progresso={r.percentualMedio}
              sub={`${r.percentualMedio.toFixed(0)}% da renda, média de ${fmt(r.mediaGastos)} por mês`}
            />

            <Kpi
              rotulo="Sobrou no ano"
              valor={r.saldoTotal}
              cor={r.saldoTotal >= 0 ? "green" : "red"}
              icone={<IconeCarteira size={19} />}
              sub="Renda menos todos os gastos"
            />

            <Kpi
              rotulo="Mês mais caro"
              valor={r.mesMaisCaro ? r.mesMaisCaro.totalGastos : "—"}
              cor="purple"
              icone={<IconeCalendario size={19} />}
              sub={r.mesMaisCaro ? labelMes(r.mesMaisCaro.mesReferencia) : ""}
            />

            <Kpi
              rotulo={`Acima de ${LIMITE_GASTOS_PERCENT}% da renda`}
              valor={`${r.mesesAcimaDoLimite} de ${r.meses.length}`}
              cor={r.mesesAcimaDoLimite > 0 ? "red" : "green"}
              icone={<IconeAlerta size={19} />}
              sub={r.mesesAcimaDoLimite === 0 ? "Nenhum mês passou do limite" : "meses que passaram do limite"}
            />
          </div>

          <section className="card">
            <div className="panel-head">
              <h2 className="panel-title">Mês a mês em {ano}</h2>
              <p className="panel-sub ano-legenda">
                <span className="ano-legenda-item ano-legenda-item--renda">Renda</span>
                <span className="ano-legenda-item ano-legenda-item--gasto">Gastos</span>
                <span className="ano-legenda-item ano-legenda-item--alerta">Acima do limite</span>
              </p>
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
