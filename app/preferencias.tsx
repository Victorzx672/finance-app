"use client";

import { useState } from "react";
import { CARTOES } from "@/lib/cartoes";
import { CATEGORIAS } from "@/lib/categorias";
import type { Preferencias } from "./dados";
import { numero } from "./ui";

const lerDia = (v: string) => {
  if (v.trim() === "") return null;
  const n = Math.floor(Number(v));
  return n >= 1 && n <= 31 ? n : undefined; // undefined = inválido
};

/** Alertas por e-mail, orçamento por categoria e dados do cartão. */
export function PainelPreferencias({
  prefs,
  onSalvar,
}: {
  prefs: Preferencias;
  onSalvar: (novas: Preferencias) => Promise<string | null>;
}) {
  const [alertaEmail, setAlertaEmail] = useState(prefs.alertaEmail);
  const [orcamentos, setOrcamentos] = useState<Record<string, number>>(prefs.orcamentos);
  const [cartoes, setCartoes] = useState(
    Object.fromEntries(
      CARTOES.map((c) => [
        c,
        {
          limite: prefs.cartoes[c]?.limite ?? 0,
          fechamento: prefs.cartoes[c]?.fechamento ? String(prefs.cartoes[c]?.fechamento) : "",
          vencimento: prefs.cartoes[c]?.vencimento ? String(prefs.cartoes[c]?.vencimento) : "",
        },
      ])
    )
  );
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const salvar = async () => {
    const cartoesFinal: Preferencias["cartoes"] = {};

    for (const nome of CARTOES) {
      const c = cartoes[nome];
      const fechamento = lerDia(c.fechamento);
      const vencimento = lerDia(c.vencimento);

      if (fechamento === undefined || vencimento === undefined) {
        setMensagem({ tipo: "error", texto: `Os dias do ${nome} devem ficar entre 1 e 31.` });
        return;
      }

      cartoesFinal[nome] = { limite: c.limite > 0 ? c.limite : null, fechamento, vencimento };
    }

    const falha = await onSalvar({ alertaEmail, orcamentos, cartoes: cartoesFinal });
    setMensagem(falha ? { tipo: "error", texto: falha } : { tipo: "ok", texto: "Preferências salvas." });
  };

  return (
    <div className="prefs-layout">
      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Avisos por e-mail</h2>
          <p className="panel-sub">Você recebe no e-mail da sua conta.</p>
        </div>

        <div className="panel-body">
          <label className="check-row">
            <input type="checkbox" checked={alertaEmail} onChange={(e) => setAlertaEmail(e.target.checked)} />
            Avisar por e-mail quando os gastos do mês passarem do limite (uma vez por mês)
          </label>
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Orçamento por categoria</h2>
          <p className="panel-sub">
            Quanto você quer gastar, no máximo, em cada categoria por mês. Deixe em branco para não limitar.
          </p>
        </div>

        <div className="panel-body prefs-grid">
          {CATEGORIAS.map((cat) => (
            <label key={cat} className="field">
              <span className="field-label">{cat}</span>
              <div className="input-wrap">
                <span className="input-affix">R$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Sem limite"
                  value={orcamentos[cat] || ""}
                  onChange={(e) => setOrcamentos((o) => ({ ...o, [cat]: numero(e.target.value) }))}
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      {CARTOES.map((nome) => (
        <section key={nome} className="card">
          <div className="panel-head">
            <h2 className="panel-title">Cartão {nome}</h2>
            <p className="panel-sub">Usado para mostrar o limite usado e o vencimento da fatura.</p>
          </div>

          <div className="panel-body prefs-grid">
            <label className="field">
              <span className="field-label">Limite do cartão</span>
              <div className="input-wrap">
                <span className="input-affix">R$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={cartoes[nome].limite || ""}
                  onChange={(e) => setCartoes((c) => ({ ...c, [nome]: { ...c[nome], limite: numero(e.target.value) } }))}
                />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Dia de fechamento</span>
              <div className="input-wrap">
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  placeholder="Ex.: 25"
                  value={cartoes[nome].fechamento}
                  onChange={(e) => setCartoes((c) => ({ ...c, [nome]: { ...c[nome], fechamento: e.target.value } }))}
                />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Dia de vencimento</span>
              <div className="input-wrap">
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  placeholder="Ex.: 5"
                  value={cartoes[nome].vencimento}
                  onChange={(e) => setCartoes((c) => ({ ...c, [nome]: { ...c[nome], vencimento: e.target.value } }))}
                />
              </div>
            </label>
          </div>
        </section>
      ))}

      <div className="prefs-salvar">
        <button className="btn btn-primary" onClick={salvar}>
          Salvar preferências
        </button>
        {mensagem && <span className={`auth-msg ${mensagem.tipo}`}>{mensagem.texto}</span>}
      </div>
    </div>
  );
}
