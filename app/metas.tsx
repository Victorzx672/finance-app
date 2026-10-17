"use client";

import { useState } from "react";
import { mesesAteMeta } from "@/lib/calculos";
import {
  MESES_RESERVA_IDEAL,
  alvoReservaSugerido,
  faltaParaMeta,
  mesesDeReserva,
  metaConcluida,
  metaPrincipal,
  progressoMeta,
  totalNaReserva,
  type MetaDinheiro,
} from "@/lib/metas";
import { Icon, fmt, numero } from "./ui";

export interface DadosMeta {
  nome: string;
  alvo: number;
  guardado: number;
  reserva: boolean;
}

/** Quantos meses a reserva de emergência cobre, e quanto falta para o ideal. */
function CartaoReserva({
  metas,
  gastosMensais,
  onCriarReserva,
}: {
  metas: MetaDinheiro[];
  gastosMensais: number;
  onCriarReserva: (alvo: number) => void;
}) {
  const temReserva = metas.some((m) => m.reserva);
  const meses = mesesDeReserva(metas, gastosMensais);
  const percentual = Math.min(100, (meses / MESES_RESERVA_IDEAL) * 100);
  const classe = meses >= MESES_RESERVA_IDEAL ? "ok" : meses >= 3 ? "warning" : "danger";

  return (
    <section className="card reserva-card">
      <div className="panel-head">
        <h2 className="panel-title">Reserva de emergência</h2>
        <p className="panel-sub">
          O ideal é guardar o equivalente a {MESES_RESERVA_IDEAL} meses de gastos para imprevistos.
        </p>
      </div>

      <div className="reserva-corpo">
        {gastosMensais <= 0 ? (
          <p className="field-hint">Preencha os gastos do mês para calcular quantos meses sua reserva cobre.</p>
        ) : !temReserva ? (
          <>
            <p className="field-hint">
              Você ainda não tem uma meta de reserva. Com seus gastos atuais, o ideal seria juntar{" "}
              <b>{fmt(alvoReservaSugerido(gastosMensais))}</b>.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => onCriarReserva(alvoReservaSugerido(gastosMensais))}>
              Criar meta de reserva
            </button>
          </>
        ) : (
          <>
            <div className="spend-head">
              <span>
                Guardado na reserva: <b>{fmt(totalNaReserva(metas))}</b> (gastos do mês: {fmt(gastosMensais)})
              </span>
              <strong>{meses.toFixed(1).replace(".", ",")} de {MESES_RESERVA_IDEAL} meses</strong>
            </div>
            <div className="spend-track">
              <div className={`spend-fill ${classe}`} style={{ width: `${percentual}%` }} />
            </div>
            <span className={`spend-note spend-note--${meses >= MESES_RESERVA_IDEAL ? "ok" : meses >= 3 ? "atencao" : "excedido"}`}>
              {meses >= MESES_RESERVA_IDEAL
                ? "Reserva completa. Parabéns!"
                : `Faltam ${fmt(Math.max(0, alvoReservaSugerido(gastosMensais) - totalNaReserva(metas)))} para chegar a ${MESES_RESERVA_IDEAL} meses.`}
            </span>
          </>
        )}
      </div>
    </section>
  );
}

function CartaoMeta({
  meta,
  principal,
  investimento,
  onAporte,
  onEditar,
  onRemover,
}: {
  meta: MetaDinheiro;
  principal: boolean;
  investimento: number;
  onAporte: (meta: MetaDinheiro, valor: number) => Promise<string | null>;
  onEditar: (meta: MetaDinheiro, dados: DadosMeta) => Promise<string | null>;
  onRemover: (meta: MetaDinheiro) => void;
}) {
  const [aporte, setAporte] = useState(0);
  const [erro, setErro] = useState("");

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(meta.nome);
  const [alvo, setAlvo] = useState(meta.alvo);
  const [guardado, setGuardado] = useState(meta.guardado);
  const [reserva, setReserva] = useState(meta.reserva);

  const concluida = metaConcluida(meta);
  const falta = faltaParaMeta(meta);
  const prazo = !concluida && investimento > 0 ? mesesAteMeta(investimento, falta) : 0;

  const movimentar = async (sinal: 1 | -1) => {
    if (aporte <= 0) return;

    setErro("");
    const falha = await onAporte(meta, sinal * aporte);

    if (falha) setErro(falha);
    else setAporte(0);
  };

  const salvar = async () => {
    if (!nome.trim() || alvo <= 0) {
      setErro("Informe o nome e o valor da meta.");
      return;
    }

    const falha = await onEditar(meta, { nome: nome.trim(), alvo, guardado, reserva });

    if (falha) setErro(falha);
    else {
      setErro("");
      setEditando(false);
    }
  };

  return (
    <article className={`meta-item ${concluida ? "meta-item--ok" : ""}`}>
      <div className="meta-topo">
        <h3 className="meta-nome">
          {meta.nome}
          {meta.reserva && <span className="expense-tag">Reserva</span>}
          {principal && <span className="expense-badge">Principal</span>}
          {concluida && <span className="meta-ok">Concluída ✓</span>}
        </h3>

        <div className="meta-acoes">
          <button className="btn-icon" onClick={() => setEditando((v) => !v)} aria-label={`Editar ${meta.nome}`} title="Editar">
            <Icon size={16}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </Icon>
          </button>
          <button className="btn-icon btn-icon--danger" onClick={() => onRemover(meta)} aria-label={`Remover ${meta.nome}`} title="Remover">
            <Icon size={16}>
              <path d="M18 6L6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </div>

      <div className="spend-head">
        <span>
          {fmt(meta.guardado)} de {fmt(meta.alvo)}
        </span>
        <strong>{progressoMeta(meta).toFixed(0)}%</strong>
      </div>
      <div className="spend-track">
        <div className={`spend-fill ${concluida ? "ok" : "azul"}`} style={{ width: `${progressoMeta(meta)}%` }} />
      </div>

      <p className="meta-prazo">
        {concluida
          ? "Meta atingida!"
          : prazo > 0
          ? `Faltam ${fmt(falta)}. No ritmo atual (${fmt(investimento)}/mês), cerca de ${prazo} ${prazo === 1 ? "mês" : "meses"}.`
          : `Faltam ${fmt(falta)}.`}
      </p>

      {editando ? (
        <div className="meta-edicao">
          <div className="edit-row">
            <div className="input-wrap">
              <input type="text" value={nome} maxLength={60} aria-label="Nome da meta" onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="input-wrap short">
              <span className="input-affix">R$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={alvo || ""}
                aria-label="Valor da meta"
                onChange={(e) => setAlvo(numero(e.target.value))}
              />
            </div>
            <div className="input-wrap short">
              <span className="input-affix">R$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={guardado || ""}
                aria-label="Já guardado"
                title="Já guardado"
                onChange={(e) => setGuardado(numero(e.target.value))}
              />
            </div>
          </div>

          <label className="check-row">
            <input type="checkbox" checked={reserva} onChange={(e) => setReserva(e.target.checked)} />
            Conta como reserva de emergência
          </label>

          <div className="edit-actions">
            <button className="btn btn-primary btn-sm" onClick={salvar}>
              Salvar
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="meta-aporte">
          <div className="input-wrap short">
            <span className="input-affix">R$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              aria-label={`Valor para ${meta.nome}`}
              value={aporte || ""}
              onChange={(e) => setAporte(numero(e.target.value))}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => movimentar(1)}>
            Guardar
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => movimentar(-1)}>
            Retirar
          </button>
        </div>
      )}

      {erro && <p className="auth-msg error">{erro}</p>}
    </article>
  );
}

export function PainelMetas({
  metas,
  investimento,
  gastosMensais,
  onCriar,
  onAporte,
  onEditar,
  onRemover,
}: {
  metas: MetaDinheiro[];
  /** quanto se investe por mês no ritmo atual */
  investimento: number;
  gastosMensais: number;
  onCriar: (dados: DadosMeta) => Promise<string | null>;
  onAporte: (meta: MetaDinheiro, valor: number) => Promise<string | null>;
  onEditar: (meta: MetaDinheiro, dados: DadosMeta) => Promise<string | null>;
  onRemover: (meta: MetaDinheiro) => void;
}) {
  const [nome, setNome] = useState("");
  const [alvo, setAlvo] = useState(0);
  const [guardado, setGuardado] = useState(0);
  const [reserva, setReserva] = useState(false);
  const [erro, setErro] = useState("");

  const principal = metaPrincipal(metas);

  const criar = async () => {
    if (!nome.trim() || alvo <= 0) {
      setErro("Informe o nome e quanto você quer juntar.");
      return;
    }

    const falha = await onCriar({ nome: nome.trim(), alvo, guardado, reserva });

    if (falha) {
      setErro(falha);
      return;
    }

    setErro("");
    setNome("");
    setAlvo(0);
    setGuardado(0);
    setReserva(false);
  };

  return (
    <div className="metas-layout">
      <CartaoReserva
        metas={metas}
        gastosMensais={gastosMensais}
        onCriarReserva={(valor) => onCriar({ nome: "Reserva de emergência", alvo: valor, guardado: 0, reserva: true })}
      />

      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Suas metas</h2>
          <p className="panel-sub">
            A primeira meta ainda não concluída aparece no resumo e no gráfico de investimento.
          </p>
        </div>

        <div className="expense-form">
          <div className="expense-add-row">
            <div className="input-wrap">
              <input
                type="text"
                placeholder="Ex.: Viagem, carro novo"
                aria-label="Nome da meta"
                value={nome}
                maxLength={60}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="input-wrap short">
              <span className="input-affix">R$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="Quero juntar"
                aria-label="Valor que quer juntar"
                value={alvo || ""}
                onChange={(e) => setAlvo(numero(e.target.value))}
              />
            </div>
            <div className="input-wrap short">
              <span className="input-affix">R$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="Já tenho"
                aria-label="Valor já guardado"
                value={guardado || ""}
                onChange={(e) => setGuardado(numero(e.target.value))}
              />
            </div>
            <button className="btn btn-primary btn-add" onClick={criar}>
              Criar meta
            </button>
          </div>

          <label className="check-row">
            <input type="checkbox" checked={reserva} onChange={(e) => setReserva(e.target.checked)} />
            Conta como reserva de emergência
          </label>

          {erro && <p className="auth-msg error">{erro}</p>}
        </div>

        {metas.length === 0 ? (
          <div className="empty-state">Nenhuma meta ainda. Crie a primeira acima.</div>
        ) : (
          <div className="metas-lista">
            {metas.map((m) => (
              <CartaoMeta
                key={`${m.id}-${m.nome}-${m.alvo}-${m.guardado}-${m.reserva}`}
                meta={m}
                principal={principal?.id === m.id}
                investimento={investimento}
                onAporte={onAporte}
                onEditar={onEditar}
                onRemover={onRemover}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
