"use client";

import { useState } from "react";
import { somar } from "@/lib/calculos";
import { diasAteVencimento, situacaoConta, textoVencimento } from "@/lib/vencimentos";
import type { ContaFixaItem } from "./dados";
import { SelectCategoria } from "./lista-gastos";
import { Icon, fmt, numero } from "./ui";

export interface EdicaoConta {
  nome: string;
  valor: number;
  dia: number;
  categoria: string | null;
}

const lerDia = (v: string) => {
  const n = Math.floor(Number(v));
  return n >= 1 && n <= 31 ? n : null;
};

/** Contas fixas do mês (aluguel, internet...), com vencimento e marcação de "pago". */
export function PainelContasFixas({
  mes,
  contas,
  pagos,
  ehMesAtual,
  onAdicionar,
  onEditar,
  onRemover,
  onPagar,
}: {
  mes: string;
  contas: ContaFixaItem[];
  pagos: string[];
  /** só no mês atual os prazos são comparados com a data de hoje */
  ehMesAtual: boolean;
  onAdicionar: (nova: EdicaoConta) => Promise<string | null>;
  onEditar: (conta: ContaFixaItem, novo: EdicaoConta) => Promise<string | null>;
  onRemover: (conta: ContaFixaItem) => void;
  onPagar: (chave: string, pago: boolean) => void;
}) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [dia, setDia] = useState("");
  const [categoria, setCategoria] = useState("");
  const [erro, setErro] = useState("");

  const [editando, setEditando] = useState<number | null>(null);
  const [eNome, setENome] = useState("");
  const [eValor, setEValor] = useState(0);
  const [eDia, setEDia] = useState("");
  const [eCategoria, setECategoria] = useState("");
  const [erroEdicao, setErroEdicao] = useState("");

  const total = somar(contas);
  const totalPendente = somar(contas.filter((c) => !pagos.includes(`conta:${c.id}`)));

  const adicionar = async () => {
    const d = lerDia(dia);

    if (!nome.trim() || valor <= 0 || !d) {
      setErro("Informe o nome, o valor e o dia do vencimento (1 a 31).");
      return;
    }

    setErro("");
    const falha = await onAdicionar({ nome: nome.trim(), valor, dia: d, categoria: categoria || null });

    if (falha) {
      setErro(falha);
      return;
    }

    setNome("");
    setValor(0);
    setDia("");
    setCategoria("");
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") adicionar();
  };

  const iniciarEdicao = (c: ContaFixaItem) => {
    setEditando(c.id);
    setENome(c.nome);
    setEValor(c.valor);
    setEDia(String(c.dia));
    setECategoria(c.categoria ?? "");
    setErroEdicao("");
  };

  const salvarEdicao = async (c: ContaFixaItem) => {
    const d = lerDia(eDia);

    if (!eNome.trim() || eValor <= 0 || !d) {
      setErroEdicao("Informe o nome, o valor e o dia do vencimento (1 a 31).");
      return;
    }

    const falha = await onEditar(c, { nome: eNome.trim(), valor: eValor, dia: d, categoria: eCategoria || null });

    if (falha) setErroEdicao(falha);
    else setEditando(null);
  };

  return (
    <section className="card tema-contas">
      <div className="panel-head">
        <h2 className="panel-title">Contas fixas</h2>
        <p className="panel-sub">Se repetem todo mês. Marque as que você já pagou.</p>
      </div>

      <div className="expense-form">
        <div className="expense-add-row">
          <div className="input-wrap">
            <input
              type="text"
              placeholder="Ex.: Aluguel, internet"
              aria-label="Nome da conta fixa"
              value={nome}
              maxLength={80}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={aoTeclar}
            />
          </div>

          <div className="input-wrap short">
            <span className="input-affix">R$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              aria-label="Valor da conta fixa"
              value={valor || ""}
              onChange={(e) => setValor(numero(e.target.value))}
              onKeyDown={aoTeclar}
            />
          </div>

          <div className="input-wrap tiny">
            <input
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              placeholder="Dia"
              aria-label="Dia do vencimento"
              title="Dia do vencimento"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              onKeyDown={aoTeclar}
            />
          </div>

          <SelectCategoria value={categoria} onChange={setCategoria} rotulo="Categoria da conta fixa" />

          <button className="btn btn-primary btn-add" onClick={adicionar}>
            Adicionar
          </button>
        </div>

        {erro && <p className="auth-msg error">{erro}</p>}
      </div>

      {contas.length === 0 ? (
        <div className="empty-state">Nenhuma conta fixa neste mês. Cadastre uma e ela passa a valer todo mês.</div>
      ) : (
        <ul className="expense-list">
          {contas.map((c) => {
            const chave = `conta:${c.id}`;
            const paga = pagos.includes(chave);
            const situacao = ehMesAtual ? situacaoConta({ dia: c.dia, mes, paga }) : paga ? "paga" : "futura";

            if (editando === c.id) {
              return (
                <li key={c.id} className="expense-item expense-item--edit">
                  <div className="edit-row">
                    <div className="input-wrap">
                      <input type="text" value={eNome} maxLength={80} aria-label="Nome" onChange={(e) => setENome(e.target.value)} />
                    </div>
                    <div className="input-wrap short">
                      <span className="input-affix">R$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={eValor || ""}
                        aria-label="Valor"
                        onChange={(e) => setEValor(numero(e.target.value))}
                      />
                    </div>
                    <div className="input-wrap tiny">
                      <input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        value={eDia}
                        aria-label="Dia do vencimento"
                        onChange={(e) => setEDia(e.target.value)}
                      />
                    </div>
                    <SelectCategoria value={eCategoria} onChange={setECategoria} rotulo="Categoria" />
                  </div>

                  <p className="field-hint">A mudança vale deste mês em diante. Os meses anteriores ficam como estavam.</p>
                  {erroEdicao && <p className="auth-msg error">{erroEdicao}</p>}

                  <div className="edit-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => salvarEdicao(c)}>
                      Salvar
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li key={c.id} className={`conta-item conta-item--${situacao}`}>
                <input
                  type="checkbox"
                  className="conta-check"
                  checked={paga}
                  onChange={(e) => onPagar(chave, e.target.checked)}
                  aria-label={`${c.nome} paga`}
                  title={paga ? "Desmarcar como paga" : "Marcar como paga"}
                />

                <div className="conta-info">
                  <span className="conta-nome">
                    {c.nome}
                    {c.categoria && <span className="expense-tag">{c.categoria}</span>}
                  </span>
                  <span className="conta-prazo">
                    {paga
                      ? "Paga"
                      : ehMesAtual
                      ? `Dia ${c.dia} · ${textoVencimento(diasAteVencimento(c.dia, mes))}`
                      : `Vence dia ${c.dia}`}
                  </span>
                </div>

                <span className="expense-value">{fmt(c.valor)}</span>

                <button className="btn-icon" onClick={() => iniciarEdicao(c)} aria-label={`Editar ${c.nome}`} title="Editar">
                  <Icon size={16}>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </Icon>
                </button>

                <button
                  className="btn-icon btn-icon--danger"
                  onClick={() => onRemover(c)}
                  aria-label={`Remover ${c.nome}`}
                  title="Remover deste mês em diante"
                >
                  <Icon size={16}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </Icon>
                </button>
              </li>
            );
          })}

          <li className="expense-total">
            <span>Total das contas fixas</span>
            <span>{fmt(total)}</span>
          </li>

          {totalPendente > 0 && totalPendente < total && (
            <li className="conta-pendente">
              <span>Ainda falta pagar</span>
              <span>{fmt(totalPendente)}</span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
