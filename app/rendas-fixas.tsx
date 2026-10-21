"use client";

import { useState } from "react";
import { somar } from "@/lib/calculos";
import type { RendaFixaItem } from "./dados";
import { IconeLapis, IconeX } from "./icones";
import { fmt, numero } from "./ui";

export interface EdicaoRendaFixa {
  nome: string;
  valor: number;
}

/** Rendas que se repetem todo mês (salários...): cadastradas uma vez, valem sempre. */
export function RendasFixas({
  rendas,
  onAdicionar,
  onEditar,
  onRemover,
}: {
  rendas: RendaFixaItem[];
  onAdicionar: (nova: EdicaoRendaFixa) => Promise<string | null>;
  onEditar: (renda: RendaFixaItem, nova: EdicaoRendaFixa) => Promise<string | null>;
  onRemover: (renda: RendaFixaItem) => void;
}) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [erro, setErro] = useState("");

  const [editando, setEditando] = useState<number | null>(null);
  const [eNome, setENome] = useState("");
  const [eValor, setEValor] = useState(0);
  const [erroEdicao, setErroEdicao] = useState("");

  const adicionar = async () => {
    if (!nome.trim() || valor <= 0) {
      setErro("Informe o nome e o valor da renda.");
      return;
    }

    setErro("");
    const falha = await onAdicionar({ nome: nome.trim(), valor });

    if (falha) {
      setErro(falha);
      return;
    }

    setNome("");
    setValor(0);
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") adicionar();
  };

  const iniciarEdicao = (r: RendaFixaItem) => {
    setEditando(r.id);
    setENome(r.nome);
    setEValor(r.valor);
    setErroEdicao("");
  };

  const salvarEdicao = async (r: RendaFixaItem) => {
    if (!eNome.trim() || eValor <= 0) {
      setErroEdicao("Informe o nome e o valor da renda.");
      return;
    }

    const falha = await onEditar(r, { nome: eNome.trim(), valor: eValor });

    if (falha) setErroEdicao(falha);
    else setEditando(null);
  };

  return (
    <div className="rendas-fixas">
      <span className="subsecao-titulo">Rendas fixas (todo mês)</span>
      <p className="field-hint">
        Cadastre uma vez e ela entra sozinha em todos os meses, deste em diante. Para mudar um valor, edite: os meses
        anteriores continuam como estavam.
      </p>

      {rendas.length > 0 && (
        <ul className="rendas-fixas-lista">
          {rendas.map((r) =>
            editando === r.id ? (
              <li key={r.id} className="renda-fixa-item renda-fixa-item--edit">
                <div className="fonte-row">
                  <div className="input-wrap">
                    <input
                      type="text"
                      value={eNome}
                      maxLength={60}
                      aria-label="Nome da renda fixa"
                      onChange={(e) => setENome(e.target.value)}
                    />
                  </div>
                  <div className="input-wrap short">
                    <span className="input-affix">R$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={eValor || ""}
                      aria-label="Valor da renda fixa"
                      onChange={(e) => setEValor(numero(e.target.value))}
                    />
                  </div>
                </div>

                {erroEdicao && <p className="auth-msg error">{erroEdicao}</p>}

                <div className="edit-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => salvarEdicao(r)}>
                    Salvar
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                </div>
              </li>
            ) : (
              <li key={r.id} className="renda-fixa-item">
                <div className="renda-fixa-info">
                  <span className="renda-fixa-nome">{r.nome}</span>
                  <span className="renda-fixa-sub">Todo mês</span>
                </div>

                <span className="expense-value">{fmt(r.valor)}</span>

                <button className="btn-icon" onClick={() => iniciarEdicao(r)} aria-label={`Editar ${r.nome}`} title="Editar">
                  <IconeLapis size={16} />
                </button>

                <button
                  className="btn-icon btn-icon--danger"
                  onClick={() => onRemover(r)}
                  aria-label={`Remover ${r.nome}`}
                  title="Remover deste mês em diante"
                >
                  <IconeX size={16} />
                </button>
              </li>
            )
          )}

          {rendas.length > 1 && (
            <li className="renda-fixa-total">
              <span>Total das rendas fixas</span>
              <span className="expense-value">{fmt(somar(rendas))}</span>
            </li>
          )}
        </ul>
      )}

      <div className="fonte-row">
        <div className="input-wrap">
          <input
            type="text"
            placeholder="Ex.: Salário"
            aria-label="Nome da nova renda fixa"
            value={nome}
            maxLength={60}
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
            aria-label="Valor da nova renda fixa"
            value={valor || ""}
            onChange={(e) => setValor(numero(e.target.value))}
            onKeyDown={aoTeclar}
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={adicionar}>
          Adicionar
        </button>
      </div>

      {erro && <p className="auth-msg error">{erro}</p>}
    </div>
  );
}
